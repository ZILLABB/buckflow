import uuid
from datetime import datetime
from pydantic import BaseModel


class OrderItemCreate(BaseModel):
    product_name: str
    quantity: int = 1
    unit_price: int


class OrderCreate(BaseModel):
    customer_id: uuid.UUID
    items: list[OrderItemCreate]
    delivery_address: str | None = None
    notes: str | None = None


class OrderStatusUpdate(BaseModel):
    status: str
    reason: str | None = None


class OrderItemResponse(BaseModel):
    id: uuid.UUID
    product_name: str
    quantity: int
    unit_price: int
    total_price: int

    class Config:
        from_attributes = True


class OrderStatusLogResponse(BaseModel):
    from_status: str | None
    to_status: str
    changed_by: str
    reason: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    id: uuid.UUID
    order_ref: str
    status: str
    total_amount: int
    currency: str
    delivery_address: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemResponse] = []
    status_logs: list[OrderStatusLogResponse] = []

    class Config:
        from_attributes = True
