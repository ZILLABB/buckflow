import uuid

from sqlalchemy import ForeignKey, String, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import UUIDBase


class AIRequest(UUIDBase):
    __tablename__ = "ai_requests"

    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("businesses.id"), index=True
    )
    conversation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=True
    )
    model: Mapped[str] = mapped_column(String(30))
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    cost_usd_cents: Mapped[int] = mapped_column(Integer, default=0)
    prompt_preview: Mapped[str | None] = mapped_column(Text)
    response_preview: Mapped[str | None] = mapped_column(Text)
