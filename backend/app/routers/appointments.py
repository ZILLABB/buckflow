import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import get_current_user
from app.models.appointment import Appointment, AppointmentStatus, ServiceItem
from app.models.user import User
from app.services.appointment_service import AppointmentService

router = APIRouter(prefix="/appointments", tags=["appointments"])


class AppointmentCreate(BaseModel):
    customer_id: str
    service_name: str
    scheduled_at: str  # ISO format datetime
    duration_mins: int = 60
    conversation_id: str | None = None
    notes: str | None = None


class AppointmentStatusUpdate(BaseModel):
    status: str


class ServiceCreate(BaseModel):
    name: str
    description: str | None = None
    price: int = 0
    duration_mins: int | None = None
    category: str | None = None


# ── Appointments ──

@router.get("")
async def list_appointments(
    status: str = Query(""),
    limit: int = Query(50, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(Appointment)
        .where(Appointment.business_id == user.business_id)
        .order_by(Appointment.scheduled_at.desc())
    )
    if status:
        q = q.where(Appointment.status == status)

    result = await db.execute(q.limit(limit))
    appointments = result.scalars().all()
    return [
        {
            "id": str(a.id),
            "appointment_ref": a.appointment_ref,
            "service_name": a.service_name,
            "status": a.status.value,
            "scheduled_at": a.scheduled_at.isoformat(),
            "duration_mins": a.duration_mins,
            "notes": a.notes,
            "customer_id": str(a.customer_id),
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in appointments
    ]


@router.post("")
async def create_appointment(
    data: AppointmentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AppointmentService(db)
    try:
        scheduled = datetime.fromisoformat(data.scheduled_at)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    appointment = await service.create_appointment(
        business_id=user.business_id,
        customer_id=uuid.UUID(data.customer_id),
        service_name=data.service_name,
        scheduled_at=scheduled,
        duration_mins=data.duration_mins,
        conversation_id=uuid.UUID(data.conversation_id) if data.conversation_id else None,
        notes=data.notes,
    )
    return {
        "id": str(appointment.id),
        "appointment_ref": appointment.appointment_ref,
        "status": appointment.status.value,
    }


@router.patch("/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: uuid.UUID,
    data: AppointmentStatusUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AppointmentService(db)
    try:
        new_status = AppointmentStatus(data.status)
        appointment = await service.update_status(appointment_id, new_status)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "id": str(appointment.id),
        "status": appointment.status.value,
    }


# ── Service Catalog ──

@router.get("/services")
async def list_services(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ServiceItem)
        .where(ServiceItem.business_id == user.business_id)
        .order_by(ServiceItem.name)
    )
    services = result.scalars().all()
    return [
        {
            "id": str(s.id),
            "name": s.name,
            "description": s.description,
            "price": s.price,
            "duration_mins": s.duration_mins,
            "is_active": s.is_active,
            "category": s.category,
        }
        for s in services
    ]


@router.post("/services")
async def create_service(
    data: ServiceCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ServiceItem(
        business_id=user.business_id,
        name=data.name,
        description=data.description,
        price=data.price,
        duration_mins=data.duration_mins,
        category=data.category,
    )
    db.add(service)
    await db.flush()
    return {"id": str(service.id), "name": service.name}
