import uuid
import random
import string
from datetime import datetime, timedelta, timezone

import structlog
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment, AppointmentStatus
from app.models.conversion import ConversionEvent, ConversionType

logger = structlog.get_logger()

VALID_TRANSITIONS = {
    AppointmentStatus.REQUESTED: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
    AppointmentStatus.CONFIRMED: [AppointmentStatus.REMINDER_SENT, AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED],
    AppointmentStatus.REMINDER_SENT: [AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW, AppointmentStatus.CANCELLED],
    AppointmentStatus.COMPLETED: [],
    AppointmentStatus.CANCELLED: [],
    AppointmentStatus.NO_SHOW: [],
}


class AppointmentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _generate_ref(self) -> str:
        chars = string.ascii_uppercase + string.digits
        return f"APT-{''.join(random.choices(chars, k=8))}"

    async def create_appointment(
        self,
        business_id: uuid.UUID,
        customer_id: uuid.UUID,
        service_name: str,
        scheduled_at: datetime,
        duration_mins: int = 60,
        conversation_id: uuid.UUID | None = None,
        notes: str | None = None,
    ) -> Appointment:
        appointment = Appointment(
            business_id=business_id,
            customer_id=customer_id,
            conversation_id=conversation_id,
            service_name=service_name,
            appointment_ref=self._generate_ref(),
            scheduled_at=scheduled_at,
            duration_mins=duration_mins,
            notes=notes,
        )
        self.db.add(appointment)
        await self.db.flush()

        # Log conversion event
        event = ConversionEvent(
            business_id=business_id,
            conversation_id=conversation_id,
            customer_id=customer_id,
            conversion_type=ConversionType.BOOKING,
            appointment_id=appointment.id,
        )
        self.db.add(event)
        await self.db.flush()

        return appointment

    async def update_status(
        self,
        appointment_id: uuid.UUID,
        new_status: AppointmentStatus,
    ) -> Appointment:
        result = await self.db.execute(
            select(Appointment).where(Appointment.id == appointment_id)
        )
        appointment = result.scalar_one_or_none()
        if not appointment:
            raise ValueError("Appointment not found")

        allowed = VALID_TRANSITIONS.get(appointment.status, [])
        if new_status not in allowed:
            raise ValueError(
                f"Cannot transition from {appointment.status.value} to {new_status.value}"
            )

        appointment.status = new_status
        await self.db.flush()
        return appointment

    async def get_pending_reminders(
        self, reminder_type: str = "24h"
    ) -> list[Appointment]:
        """Get appointments needing reminders."""
        now = datetime.now(timezone.utc)

        if reminder_type == "24h":
            window_start = now + timedelta(hours=23)
            window_end = now + timedelta(hours=25)
            stmt = select(Appointment).where(
                and_(
                    Appointment.status.in_([
                        AppointmentStatus.CONFIRMED,
                    ]),
                    Appointment.scheduled_at.between(window_start, window_end),
                    Appointment.reminder_24h_sent == False,
                )
            )
        elif reminder_type == "2h":
            window_start = now + timedelta(hours=1, minutes=45)
            window_end = now + timedelta(hours=2, minutes=15)
            stmt = select(Appointment).where(
                and_(
                    Appointment.status.in_([
                        AppointmentStatus.CONFIRMED,
                        AppointmentStatus.REMINDER_SENT,
                    ]),
                    Appointment.scheduled_at.between(window_start, window_end),
                    Appointment.reminder_2h_sent == False,
                )
            )
        else:
            return []

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_followup_due(self) -> list[Appointment]:
        """Get completed appointments needing follow-up (1 day after)."""
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(hours=24)
        stmt = select(Appointment).where(
            and_(
                Appointment.status == AppointmentStatus.COMPLETED,
                Appointment.followup_sent == False,
                Appointment.scheduled_at <= cutoff,
            )
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
