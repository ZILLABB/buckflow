import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.middleware.auth import get_current_user
from app.models.conversation import Conversation, ConversationMode
from app.models.customer import Customer, CustomerStatus
from app.models.message import Message, MessageDirection, MessageType, ResponseSource
from app.models.mode_change_log import ModeChangeLog
from app.models.user import User
from app.whatsapp.client import WhatsAppClient

router = APIRouter(prefix="/conversations", tags=["conversations"])


class ConversationModeUpdate(BaseModel):
    mode: str
    reason: str | None = None


class ConversationReply(BaseModel):
    message: str


class ConversationAssign(BaseModel):
    user_id: str | None = None


class CustomerControlUpdate(BaseModel):
    status: str | None = None
    ai_enabled: bool | None = None
    is_flagged: bool | None = None
    tags: list[str] | None = None
    block_reason: str | None = None


@router.get("")
async def list_conversations(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    archived: bool = Query(False),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Conversation)
        .options(selectinload(Conversation.customer))
        .where(
            Conversation.business_id == user.business_id,
            Conversation.is_active == True,
            Conversation.is_archived == archived,
        )
        .order_by(Conversation.last_message_at.desc().nullslast())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    conversations = result.scalars().all()

    items = []
    for c in conversations:
        last_msg = await db.scalar(
            select(Message.content)
            .where(Message.conversation_id == c.id)
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        msg_count = await db.scalar(
            select(func.count(Message.id)).where(Message.conversation_id == c.id)
        )
        items.append({
            "id": str(c.id),
            "customer_name": c.customer.name if c.customer else "Unknown",
            "customer_phone": c.customer.phone if c.customer else "",
            "customer_status": c.customer.status.value if c.customer else "active",
            "customer_flagged": c.customer.is_flagged if c.customer else False,
            "customer_tags": c.customer.tags if c.customer else [],
            "mode": c.mode.value,
            "is_locked": c.is_locked,
            "locked_by": c.locked_by,
            "assigned_to": str(c.assigned_to) if c.assigned_to else None,
            "is_archived": c.is_archived,
            "last_message": last_msg,
            "last_message_at": c.last_message_at.isoformat() if c.last_message_at else None,
            "message_count": msg_count or 0,
        })
    return items


@router.get("/{conversation_id}/messages")
async def get_messages(
    conversation_id: uuid.UUID,
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await db.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.business_id == user.business_id,
        )
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .limit(limit)
        .offset(offset)
    )
    messages = result.scalars().all()
    return [
        {
            "id": str(m.id),
            "direction": m.direction.value,
            "content": m.content,
            "msg_type": m.msg_type.value,
            "response_source": m.response_source.value if m.response_source else None,
            "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]


@router.post("/{conversation_id}/reply")
async def send_reply(
    conversation_id: uuid.UUID,
    data: ConversationReply,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a human reply to a customer via WhatsApp."""
    conv = await db.scalar(
        select(Conversation)
        .options(selectinload(Conversation.customer))
        .where(
            Conversation.id == conversation_id,
            Conversation.business_id == user.business_id,
        )
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if not conv.customer:
        raise HTTPException(status_code=400, detail="No customer linked to conversation")

    # Get business WhatsApp credentials
    from app.models.business import Business
    business = await db.scalar(
        select(Business).where(Business.id == user.business_id)
    )
    if not business or not business.whatsapp_phone_number_id or not business.whatsapp_api_token:
        raise HTTPException(
            status_code=400,
            detail="WhatsApp is not configured for this business",
        )

    # Send via WhatsApp
    wa_client = WhatsAppClient(
        phone_number_id=business.whatsapp_phone_number_id,
        api_token=business.whatsapp_api_token,
    )
    result = await wa_client.send_text(conv.customer.wa_id, data.message)

    wa_msg_id = None
    if result and "messages" in result:
        wa_msg_id = result["messages"][0].get("id")

    # Store the message
    message = Message(
        conversation_id=conv.id,
        wa_message_id=wa_msg_id,
        direction=MessageDirection.OUTBOUND,
        content=data.message,
        response_source=ResponseSource.HUMAN,
    )
    db.add(message)

    # Update last_message_at
    await db.execute(
        update(Conversation)
        .where(Conversation.id == conversation_id)
        .values(last_message_at=datetime.now(timezone.utc))
    )
    await db.flush()

    return {
        "id": str(message.id),
        "direction": "outbound",
        "content": message.content,
        "response_source": "human",
        "created_at": message.created_at.isoformat() if message.created_at else None,
        "wa_message_id": wa_msg_id,
    }


@router.patch("/{conversation_id}/mode")
async def update_conversation_mode(
    conversation_id: uuid.UUID,
    data: ConversationModeUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await db.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.business_id == user.business_id,
        )
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    old_mode = conv.mode.value

    try:
        new_mode = ConversationMode(data.mode)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid mode. Use 'ai' or 'human'")

    # Human takeover safety: lock chat when switching to human
    conv.mode = new_mode
    if new_mode == ConversationMode.HUMAN:
        conv.is_locked = True
        conv.locked_by = user.full_name
    else:
        conv.is_locked = False
        conv.locked_by = None

    # Audit log
    log = ModeChangeLog(
        conversation_id=conv.id,
        changed_by=user.id,
        from_mode=old_mode,
        to_mode=new_mode.value,
        reason=data.reason,
    )
    db.add(log)
    await db.flush()
    return {"id": str(conv.id), "mode": conv.mode.value, "is_locked": conv.is_locked}


@router.patch("/{conversation_id}/archive")
async def toggle_archive(
    conversation_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await db.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.business_id == user.business_id,
        )
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conv.is_archived = not conv.is_archived
    await db.flush()
    return {"id": str(conv.id), "is_archived": conv.is_archived}


@router.patch("/{conversation_id}/assign")
async def assign_conversation(
    conversation_id: uuid.UUID,
    data: ConversationAssign,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await db.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.business_id == user.business_id,
        )
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conv.assigned_to = uuid.UUID(data.user_id) if data.user_id else None
    await db.flush()
    return {"id": str(conv.id), "assigned_to": str(conv.assigned_to) if conv.assigned_to else None}


# ── Customer Control Endpoints ──────────────────────────────

@router.get("/customers")
async def list_customers(
    search: str = Query("", max_length=100),
    status: str = Query(""),
    limit: int = Query(50, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Customer).where(Customer.business_id == user.business_id).order_by(Customer.created_at.desc())
    if search:
        q = q.where(
            Customer.name.ilike(f"%{search}%")
            | Customer.phone.ilike(f"%{search}%")
        )
    if status:
        q = q.where(Customer.status == status)

    result = await db.execute(q.limit(limit))
    customers = result.scalars().all()
    return [
        {
            "id": str(c.id),
            "name": c.name,
            "phone": c.phone,
            "email": c.email,
            "status": c.status.value,
            "ai_enabled": c.ai_enabled,
            "is_flagged": c.is_flagged,
            "tags": c.tags or [],
            "block_reason": c.block_reason,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in customers
    ]


@router.patch("/customers/{customer_id}")
async def update_customer_control(
    customer_id: uuid.UUID,
    data: CustomerControlUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    customer = await db.scalar(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.business_id == user.business_id,
        )
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if data.status is not None:
        customer.status = CustomerStatus(data.status)
    if data.ai_enabled is not None:
        customer.ai_enabled = data.ai_enabled
    if data.is_flagged is not None:
        customer.is_flagged = data.is_flagged
    if data.tags is not None:
        customer.tags = data.tags
    if data.block_reason is not None:
        customer.block_reason = data.block_reason

    await db.flush()
    return {"id": str(customer.id), "status": customer.status.value}
