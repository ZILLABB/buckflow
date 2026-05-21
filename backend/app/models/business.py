from sqlalchemy import String, Boolean, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import UUIDBase


class Business(UUIDBase):
    __tablename__ = "businesses"

    name: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)

    whatsapp_phone_number_id: Mapped[str | None] = mapped_column(String(50))
    whatsapp_api_token: Mapped[str | None] = mapped_column(String(500))
    whatsapp_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    ai_system_prompt: Mapped[str | None] = mapped_column(Text)
    ai_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    monthly_ai_limit: Mapped[int] = mapped_column(Integer, default=500)
    monthly_conversation_limit: Mapped[int] = mapped_column(Integer, default=1000)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    users: Mapped[list["User"]] = relationship(back_populates="business")
    customers: Mapped[list["Customer"]] = relationship(back_populates="business")
    conversations: Mapped[list["Conversation"]] = relationship(back_populates="business")
    orders: Mapped[list["Order"]] = relationship(back_populates="business")
    rule_responses: Mapped[list["RuleResponse"]] = relationship(back_populates="business")
    subscriptions: Mapped[list["Subscription"]] = relationship(back_populates="business")
