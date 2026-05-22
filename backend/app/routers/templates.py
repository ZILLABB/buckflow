"""
WhatsApp Templates Router — Manage message templates for notifications and reminders.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import get_current_user
from app.models.whatsapp_template import WhatsAppTemplate, TemplateCategory
from app.models.user import User

router = APIRouter(prefix="/templates", tags=["templates"])


class TemplateCreate(BaseModel):
    name: str
    category: str
    body_text: str
    language_code: str = "en"
    header_text: str | None = None
    footer_text: str | None = None
    parameter_map: dict | None = None


class TemplateUpdate(BaseModel):
    name: str | None = None
    body_text: str | None = None
    header_text: str | None = None
    footer_text: str | None = None
    parameter_map: dict | None = None
    is_active: bool | None = None


@router.get("")
async def list_templates(
    category: str = Query(""),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all WhatsApp templates for the business."""
    q = select(WhatsAppTemplate).where(
        WhatsAppTemplate.business_id == user.business_id
    ).order_by(WhatsAppTemplate.created_at.desc())

    if category:
        try:
            cat = TemplateCategory(category)
            q = q.where(WhatsAppTemplate.category == cat)
        except ValueError:
            pass

    result = await db.execute(q)
    templates = result.scalars().all()

    return [
        {
            "id": str(t.id),
            "name": t.name,
            "category": t.category.value,
            "language_code": t.language_code,
            "body_text": t.body_text,
            "header_text": t.header_text,
            "footer_text": t.footer_text,
            "parameter_map": t.parameter_map,
            "is_active": t.is_active,
            "is_approved": t.is_approved,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in templates
    ]


@router.post("")
async def create_template(
    data: TemplateCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new WhatsApp template."""
    try:
        category = TemplateCategory(data.category)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Options: {[c.value for c in TemplateCategory]}"
        )

    template = WhatsAppTemplate(
        business_id=user.business_id,
        name=data.name,
        category=category,
        language_code=data.language_code,
        body_text=data.body_text,
        header_text=data.header_text,
        footer_text=data.footer_text,
        parameter_map=data.parameter_map,
    )
    db.add(template)
    await db.flush()

    return {
        "id": str(template.id),
        "name": template.name,
        "category": template.category.value,
        "status": "created",
    }


@router.patch("/{template_id}")
async def update_template(
    template_id: uuid.UUID,
    data: TemplateUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a WhatsApp template."""
    template = await db.scalar(
        select(WhatsAppTemplate).where(
            WhatsAppTemplate.id == template_id,
            WhatsAppTemplate.business_id == user.business_id,
        )
    )
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(template, field, value)

    await db.flush()
    return {"id": str(template.id), "status": "updated"}


@router.delete("/{template_id}")
async def delete_template(
    template_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a WhatsApp template."""
    template = await db.scalar(
        select(WhatsAppTemplate).where(
            WhatsAppTemplate.id == template_id,
            WhatsAppTemplate.business_id == user.business_id,
        )
    )
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    await db.delete(template)
    await db.flush()
    return {"status": "deleted"}


@router.get("/categories")
async def list_categories(
    user: User = Depends(get_current_user),
):
    """List available template categories."""
    return [
        {"value": c.value, "label": c.value.replace("_", " ").title()}
        for c in TemplateCategory
    ]
