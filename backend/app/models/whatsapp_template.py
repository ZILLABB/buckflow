"""WhatsApp Message Template model for storing business-specific template configs."""
import enum
import uuid

from sqlalchemy import ForeignKey, String, Boolean, Enum, Text
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import UUIDBase


class TemplateCategory(str, enum.Enum):
    APPOINTMENT_REMINDER = "appointment_reminder"
    APPOINTMENT_CONFIRMATION = "appointment_confirmation"
    ORDER_CONFIRMATION = "order_confirmation"
    ORDER_UPDATE = "order_update"
    PAYMENT_REMINDER = "payment_reminder"
    WELCOME = "welcome"
    FOLLOW_UP = "follow_up"
    CUSTOM = "custom"


class WhatsAppTemplate(UUIDBase):
    __tablename__ = "whatsapp_templates"

    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("businesses.id"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))  # template name on Meta
    category: Mapped[TemplateCategory] = mapped_column(
        Enum(TemplateCategory), default=TemplateCategory.CUSTOM
    )
    language_code: Mapped[str] = mapped_column(String(10), default="en")
    body_text: Mapped[str] = mapped_column(Text)  # template body with {{1}} placeholders
    header_text: Mapped[str | None] = mapped_column(String(255))
    footer_text: Mapped[str | None] = mapped_column(String(100))
    # Parameter mapping: {"1": "customer_name", "2": "appointment_date", ...}
    parameter_map: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False)

    business: Mapped["Business"] = relationship()
