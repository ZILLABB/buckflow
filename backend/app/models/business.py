import enum

from sqlalchemy import String, Boolean, Text, Integer, Enum
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import UUIDBase


class BusinessCategory(str, enum.Enum):
    RETAIL = "retail"
    RESTAURANT = "restaurant"
    SALON = "salon"
    SPA = "spa"
    CLINIC = "clinic"
    LOGISTICS = "logistics"
    CONSULTING = "consulting"
    FASHION = "fashion"
    ELECTRONICS = "electronics"
    GROCERY = "grocery"
    OTHER = "other"


class BusinessType(str, enum.Enum):
    PRODUCT = "product"
    SERVICE = "service"
    HYBRID = "hybrid"


class Business(UUIDBase):
    __tablename__ = "businesses"

    name: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)

    # Business type & category
    business_type: Mapped[BusinessType] = mapped_column(
        Enum(BusinessType), default=BusinessType.PRODUCT
    )
    category: Mapped[BusinessCategory] = mapped_column(
        Enum(BusinessCategory), default=BusinessCategory.OTHER
    )

    # Operating hours: JSON { "mon": {"open": "09:00", "close": "17:00"}, ... }
    operating_hours: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    timezone: Mapped[str] = mapped_column(String(50), default="Africa/Lagos")
    auto_reply_outside_hours: Mapped[bool] = mapped_column(Boolean, default=True)
    outside_hours_message: Mapped[str | None] = mapped_column(
        Text,
        default="Thanks for reaching out! We're currently closed. We'll respond when we're back online."
    )

    # Booking settings (for service businesses)
    booking_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    booking_lead_time_hours: Mapped[int] = mapped_column(Integer, default=24)
    booking_slot_duration_mins: Mapped[int] = mapped_column(Integer, default=60)

    whatsapp_phone_number_id: Mapped[str | None] = mapped_column(String(50))
    whatsapp_api_token: Mapped[str | None] = mapped_column(String(500))
    whatsapp_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    ai_system_prompt: Mapped[str | None] = mapped_column(Text)
    ai_model: Mapped[str] = mapped_column(String(30), default="gpt-4o-mini")
    ai_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    human_only_mode: Mapped[bool] = mapped_column(Boolean, default=False)

    monthly_ai_limit: Mapped[int] = mapped_column(Integer, default=500)
    monthly_conversation_limit: Mapped[int] = mapped_column(Integer, default=1000)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    users: Mapped[list["User"]] = relationship(back_populates="business")
    customers: Mapped[list["Customer"]] = relationship(back_populates="business")
    conversations: Mapped[list["Conversation"]] = relationship(back_populates="business")
    orders: Mapped[list["Order"]] = relationship(back_populates="business")
    rule_responses: Mapped[list["RuleResponse"]] = relationship(back_populates="business")
    subscriptions: Mapped[list["Subscription"]] = relationship(back_populates="business")
    appointments: Mapped[list["Appointment"]] = relationship(back_populates="business")
    services: Mapped[list["ServiceItem"]] = relationship(back_populates="business")
