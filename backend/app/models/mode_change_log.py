import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import UUIDBase


class ModeChangeLog(UUIDBase):
    """Audit log for AI/human mode switches and chat locking."""
    __tablename__ = "mode_change_logs"

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id"), index=True
    )
    changed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    from_mode: Mapped[str] = mapped_column(String(20))
    to_mode: Mapped[str] = mapped_column(String(20))
    reason: Mapped[str | None] = mapped_column(String(255))
