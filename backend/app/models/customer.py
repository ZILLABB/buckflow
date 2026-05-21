import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import UUIDBase


class Customer(UUIDBase):
    __tablename__ = "customers"

    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("businesses.id"), index=True
    )
    wa_id: Mapped[str] = mapped_column(String(50), index=True)
    phone: Mapped[str] = mapped_column(String(20))
    name: Mapped[str | None] = mapped_column(String(150))
    email: Mapped[str | None] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)

    business: Mapped["Business"] = relationship(back_populates="customers")
    conversations: Mapped[list["Conversation"]] = relationship(back_populates="customer")
    orders: Mapped[list["Order"]] = relationship(back_populates="customer")
