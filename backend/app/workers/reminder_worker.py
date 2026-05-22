"""
Background Reminder Worker.
Runs periodically to send appointment reminders and post-service follow-ups.
Can be triggered by a cron job, scheduler, or background task runner.
"""
import asyncio
from datetime import datetime, timezone, timedelta

import structlog
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.core.config import get_settings
from app.models.appointment import Appointment, AppointmentStatus
from app.services.notification_service import NotificationService

logger = structlog.get_logger()
settings = get_settings()


async def run_reminder_check():
    """Check for appointments needing reminders and send them."""
    engine = create_async_engine(settings.database_url)
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    async with async_session() as db:
        notification = NotificationService(db)
        now = datetime.now(timezone.utc)

        # ── 24-hour reminders ──
        window_24h_start = now + timedelta(hours=23)
        window_24h_end = now + timedelta(hours=25)

        result = await db.execute(
            select(Appointment).where(
                and_(
                    Appointment.status == AppointmentStatus.CONFIRMED,
                    Appointment.scheduled_at >= window_24h_start,
                    Appointment.scheduled_at <= window_24h_end,
                    Appointment.reminder_24h_sent == False,
                )
            )
        )
        appointments_24h = result.scalars().all()

        for apt in appointments_24h:
            try:
                sent = await notification.send_appointment_reminder(apt, hours_before=24)
                if sent:
                    logger.info("reminder_24h_sent", appointment_id=str(apt.id))
            except Exception as e:
                logger.error("reminder_24h_failed", error=str(e), appointment_id=str(apt.id))

        # ── 2-hour reminders ──
        window_2h_start = now + timedelta(hours=1, minutes=45)
        window_2h_end = now + timedelta(hours=2, minutes=15)

        result = await db.execute(
            select(Appointment).where(
                and_(
                    Appointment.status == AppointmentStatus.CONFIRMED,
                    Appointment.scheduled_at >= window_2h_start,
                    Appointment.scheduled_at <= window_2h_end,
                    Appointment.reminder_2h_sent == False,
                )
            )
        )
        appointments_2h = result.scalars().all()

        for apt in appointments_2h:
            try:
                sent = await notification.send_appointment_reminder(apt, hours_before=2)
                if sent:
                    logger.info("reminder_2h_sent", appointment_id=str(apt.id))
            except Exception as e:
                logger.error("reminder_2h_failed", error=str(e), appointment_id=str(apt.id))

        # ── Post-service follow-ups (2 hours after appointment end) ──
        followup_cutoff = now - timedelta(hours=2)

        result = await db.execute(
            select(Appointment).where(
                and_(
                    Appointment.status == AppointmentStatus.COMPLETED,
                    Appointment.scheduled_at <= followup_cutoff,
                    Appointment.followup_sent == False,
                )
            )
        )
        followups = result.scalars().all()

        for apt in followups:
            try:
                sent = await notification.send_appointment_followup(apt)
                if sent:
                    logger.info("followup_sent", appointment_id=str(apt.id))
            except Exception as e:
                logger.error("followup_failed", error=str(e), appointment_id=str(apt.id))

        await db.commit()

    await engine.dispose()
    logger.info(
        "reminder_check_complete",
        reminders_24h=len(appointments_24h),
        reminders_2h=len(appointments_2h),
        followups=len(followups),
    )


async def run_forever(interval_seconds: int = 300):
    """Run the reminder worker in a loop (every 5 minutes)."""
    logger.info("reminder_worker_started", interval=interval_seconds)
    while True:
        try:
            await run_reminder_check()
        except Exception as e:
            logger.error("reminder_worker_error", error=str(e))
        await asyncio.sleep(interval_seconds)


if __name__ == "__main__":
    asyncio.run(run_forever())
