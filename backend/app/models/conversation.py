import enum
import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, Enum, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import UUIDBase


class ConversationMode(str, enum.Enum):
    AI = "ai"
    HUMAN = "human"


class Conversation(UUIDBase):
    __tablename__ = "conversations"

    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("businesses.id"), index=True
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id"), index=True
    )
    wa_conversation_id: Mapped[str | None] = mapped_column(String(100))
    mode: Mapped[ConversationMode] = mapped_column(
        Enum(ConversationMode), default=ConversationMode.AI
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    business: Mapped["Business"] = relationship(back_populates="conversations")
    customer: Mapped["Customer"] = relationship(back_populates="conversations")
    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation", order_by="Message.created_at"
    )
