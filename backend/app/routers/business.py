import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import get_current_user
from app.models.business import Business
from app.models.rule_response import RuleResponse
from app.models.user import User

router = APIRouter(prefix="/business", tags=["business"])


class BusinessUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    whatsapp_phone_number_id: str | None = None
    whatsapp_api_token: str | None = None
    ai_system_prompt: str | None = None
    ai_enabled: bool | None = None


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

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(biz, field, value)

    if data.whatsapp_phone_number_id and data.whatsapp_api_token:
        biz.whatsapp_verified = True

    await db.flush()
    return {"status": "updated"}


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
