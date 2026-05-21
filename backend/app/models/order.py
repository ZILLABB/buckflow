import enum
import uuid

from sqlalchemy import ForeignKey, String, Text, Enum, Integer, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import UUIDBase


class OrderStatus(str, enum.Enum):
    CREATED = "created"
    CONFIRMED = "confirmed"
    PAID = "paid"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCEL_REQUESTED = "cancel_requested"
    CANCELLED = "cancelled"
    REFUND_PENDING = "refund_pending"


class Order(UUIDBase):
    __tablename__ = "orders"

    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("businesses.id"), index=True
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id"), index=True
    )
    conversation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=True
    )
    order_ref: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus), default=OrderStatus.CREATED
    )
    total_amount: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(3), default="NGN")
    delivery_address: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)

    business: Mapped["Business"] = relationship(back_populates="orders")
    customer: Mapped["Customer"] = relationship(back_populates="orders")
    items: Mapped[list["OrderItem"]] = relationship(back_populates="order")
    status_logs: Mapped[list["OrderStatusLog"]] = relationship(back_populates="order")


class OrderItem(UUIDBase):
    __tablename__ = "order_items"

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id")
    )
    product_name: Mapped[str] = mapped_column(String(255))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[int] = mapped_column(Integer)
    total_price: Mapped[int] = mapped_column(Integer)

    order: Mapped["Order"] = relationship(back_populates="items")


class OrderStatusLog(UUIDBase):
    __tablename__ = "order_status_logs"

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id"), index=True
    )
    from_status: Mapped[str | None] = mapped_column(String(30))
    to_status: Mapped[str] = mapped_column(String(30))
    changed_by: Mapped[str] = mapped_column(String(50))
    reason: Mapped[str | None] = mapped_column(Text)

    order: Mapped["Order"] = relationship(back_populates="status_logs")
