import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.middleware.auth import get_current_user
from app.models.conversation import Conversation, ConversationMode
from app.models.customer import Customer
from app.models.message import Message, MessageDirection
from app.models.user import User

router = APIRouter(prefix="/conversations", tags=["conversations"])


class ConversationModeUpdate(BaseModel):
    mode: str


@router.get("")
async def list_conversations(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Conversation)
        .options(selectinload(Conversation.customer))
        .where(
            Conversation.business_id == user.business_id,
            Conversation.is_active == True,
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
            "mode": c.mode.value,
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

    try:
        conv.mode = ConversationMode(data.mode)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid mode. Use 'ai' or 'human'")

    await db.flush()
    return {"id": str(conv.id), "mode": conv.mode.value}
