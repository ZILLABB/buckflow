import enum
import uuid

from sqlalchemy import ForeignKey, String, Text, Enum, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import UUIDBase


class MessageDirection(str, enum.Enum):
    INBOUND = "inbound"
    OUTBOUND = "outbound"


class MessageType(str, enum.Enum):
    TEXT = "text"
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"
    DOCUMENT = "document"
    LOCATION = "location"
    INTERACTIVE = "interactive"


class ResponseSource(str, enum.Enum):
    RULE_ENGINE = "rule_engine"
    AI_MINI = "ai_mini"
    AI_PREMIUM = "ai_premium"
    HUMAN = "human"
    CACHE = "cache"
    SYSTEM = "system"


class Message(UUIDBase):
    __tablename__ = "messages"

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id"), index=True
    )
    wa_message_id: Mapped[str | None] = mapped_column(String(100), unique=True)
    direction: Mapped[MessageDirection] = mapped_column(Enum(MessageDirection))
    msg_type: Mapped[MessageType] = mapped_column(
        Enum(MessageType), default=MessageType.TEXT
    )
    content: Mapped[str] = mapped_column(Text)
    media_url: Mapped[str | None] = mapped_column(String(500))
    response_source: Mapped[ResponseSource | None] = mapped_column(
        Enum(ResponseSource), nullable=True
    )
    tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    cost_naira: Mapped[int] = mapped_column(Integer, default=0)

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")
