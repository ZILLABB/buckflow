import uuid
from datetime import date

from sqlalchemy import ForeignKey, Integer, Date, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import UUIDBase


class UsageLog(UUIDBase):
    __tablename__ = "usage_logs"
    __table_args__ = (
        UniqueConstraint("business_id", "log_date", name="uq_usage_business_date"),
    )

    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("businesses.id"), index=True
    )
    log_date: Mapped[date] = mapped_column(Date, index=True)
    total_messages: Mapped[int] = mapped_column(Integer, default=0)
    rule_responses: Mapped[int] = mapped_column(Integer, default=0)
    ai_mini_responses: Mapped[int] = mapped_column(Integer, default=0)
    ai_premium_responses: Mapped[int] = mapped_column(Integer, default=0)
    cache_hits: Mapped[int] = mapped_column(Integer, default=0)
    human_responses: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_cost_usd_cents: Mapped[int] = mapped_column(Integer, default=0)
    conversations_started: Mapped[int] = mapped_column(Integer, default=0)
