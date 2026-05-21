import uuid

from sqlalchemy import ForeignKey, String, Text, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import UUIDBase


class RuleResponse(UUIDBase):
    __tablename__ = "rule_responses"

    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("businesses.id"), index=True
    )
    category: Mapped[str] = mapped_column(String(50), index=True)
    keywords: Mapped[list[str]] = mapped_column(ARRAY(String))
    response_text: Mapped[str] = mapped_column(Text)
    priority: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    business: Mapped["Business"] = relationship(back_populates="rule_responses")
