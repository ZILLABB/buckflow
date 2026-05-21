import enum
import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, Enum, Integer, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import UUIDBase


class PlanTier(str, enum.Enum):
    BASIC = "basic"
    GROWTH = "growth"
    PRO = "pro"


class Plan(UUIDBase):
    __tablename__ = "plans"

    name: Mapped[str] = mapped_column(String(50))
    tier: Mapped[PlanTier] = mapped_column(Enum(PlanTier), unique=True)
    price_naira: Mapped[int] = mapped_column(Integer)
    conversation_limit: Mapped[int] = mapped_column(Integer)
    ai_messages_limit: Mapped[int] = mapped_column(Integer)
    ai_model: Mapped[str] = mapped_column(String(30), default="gpt-4o-mini")
    rag_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELLED = "cancelled"
    TRIAL = "trial"


class Subscription(UUIDBase):
    __tablename__ = "subscriptions"

    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("businesses.id"), index=True
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plans.id")
    )
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus), default=SubscriptionStatus.TRIAL
    )
    current_period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    current_period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    paystack_subscription_code: Mapped[str | None] = mapped_column(String(100))

    business: Mapped["Business"] = relationship(back_populates="subscriptions")
    plan: Mapped["Plan"] = relationship()
