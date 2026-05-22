import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import get_current_user
from app.models.business import Business, BusinessType, BusinessCategory
from app.models.rule_response import RuleResponse
from app.models.user import User

router = APIRouter(prefix="/business", tags=["business"])


class BusinessUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    ai_system_prompt: str | None = None
    # Business type & category
    business_type: str | None = None
    category: str | None = None
    # Operating hours & automation
    operating_hours: dict | None = None
    timezone: str | None = None
    auto_reply_outside_hours: bool | None = None
    outside_hours_message: str | None = None
    # Booking settings
    booking_enabled: bool | None = None
    booking_lead_time_hours: int | None = None
    booking_slot_duration_mins: int | None = None
    # Auto-pilot (human_only_mode = !autopilot)
    human_only_mode: bool | None = None


class RuleCreate(BaseModel):
    category: str
    keywords: list[str]
    response_text: str
    priority: int = 0


@router.get("/me")
async def get_my_business(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not user.business_id:
        raise HTTPException(status_code=404, detail="No business linked")
    result = await db.execute(
        select(Business).where(Business.id == user.business_id)
    )
    biz = result.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")
    return {
        "id": str(biz.id),
        "name": biz.name,
        "slug": biz.slug,
        "description": biz.description,
        "whatsapp_connected": biz.whatsapp_verified,
        "ai_enabled": biz.ai_enabled,
        "business_type": biz.business_type.value,
        "category": biz.category.value,
        "operating_hours": biz.operating_hours,
        "timezone": biz.timezone,
        "auto_reply_outside_hours": biz.auto_reply_outside_hours,
        "outside_hours_message": biz.outside_hours_message,
        "booking_enabled": biz.booking_enabled,
        "booking_lead_time_hours": biz.booking_lead_time_hours,
        "booking_slot_duration_mins": biz.booking_slot_duration_mins,
        "human_only_mode": biz.human_only_mode,
    }


@router.patch("/me")
async def update_business(
    data: BusinessUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Business).where(Business.id == user.business_id)
    )
    biz = result.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")

    update_data = data.model_dump(exclude_unset=True)

    # Validate enum fields
    if "business_type" in update_data:
        try:
            update_data["business_type"] = BusinessType(update_data["business_type"])
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid business_type")
    if "category" in update_data:
        try:
            update_data["category"] = BusinessCategory(update_data["category"])
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid category")

    for field, value in update_data.items():
        setattr(biz, field, value)

    await db.flush()
    return {"status": "updated"}


class ConnectWhatsAppRequest(BaseModel):
    phone_number: str


@router.post("/connect-whatsapp")
async def request_whatsapp_connection(
    data: ConnectWhatsAppRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Business requests WhatsApp connection.
    Stores their phone number — super admin will connect it from the admin panel.
    """
    result = await db.execute(
        select(Business).where(Business.id == user.business_id)
    )
    biz = result.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")

    # Store the phone number for admin to process
    biz.phone = data.phone_number
    await db.flush()

    return {
        "status": "pending",
        "message": "Connection request received. Your number will be connected within 24 hours.",
    }


@router.post("/rules")
async def create_rule(
    data: RuleCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rule = RuleResponse(
        business_id=user.business_id,
        category=data.category,
        keywords=data.keywords,
        response_text=data.response_text,
        priority=data.priority,
    )
    db.add(rule)
    await db.flush()
    return {"id": str(rule.id), "status": "created"}


@router.get("/rules")
async def list_rules(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RuleResponse)
        .where(RuleResponse.business_id == user.business_id)
        .order_by(RuleResponse.priority.desc())
    )
    rules = result.scalars().all()
    return [
        {
            "id": str(r.id),
            "category": r.category,
            "keywords": r.keywords,
            "response_text": r.response_text,
            "priority": r.priority,
            "is_active": r.is_active,
        }
        for r in rules
    ]


@router.delete("/rules/{rule_id}")
async def delete_rule(
    rule_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RuleResponse).where(
            RuleResponse.id == rule_id,
            RuleResponse.business_id == user.business_id,
        )
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    await db.delete(rule)
    await db.flush()
    return {"status": "deleted"}
