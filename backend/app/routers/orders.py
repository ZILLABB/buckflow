import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import get_current_user
from app.models.order import OrderStatus
from app.models.user import User
from app.schemas.order import (
    OrderCreate,
    OrderItemResponse,
    OrderResponse,
    OrderStatusLogResponse,
    OrderStatusUpdate,
)
from app.services.order_service import OrderService

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=OrderResponse)
async def create_order(
    data: OrderCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = OrderService(db)
    items = [item.model_dump() for item in data.items]
    order = await service.create_order(
        business_id=user.business_id,
        customer_id=data.customer_id,
        items=items,
        delivery_address=data.delivery_address,
        notes=data.notes,
    )
    return _serialize_order(order)


@router.get("", response_model=list[OrderResponse])
async def list_orders(
    status: str | None = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = OrderService(db)
    status_filter = None
    if status:
        try:
            status_filter = OrderStatus(status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    orders = await service.list_orders(
        user.business_id, status=status_filter, limit=limit, offset=offset
    )
    return [_serialize_order(o) for o in orders]


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = OrderService(db)
    order = await service.get_order(order_id)
    if not order or order.business_id != user.business_id:
        raise HTTPException(status_code=404, detail="Order not found")
    return _serialize_order(order)


@router.patch("/{order_id}/status")
async def update_order_status(
    order_id: uuid.UUID,
    data: OrderStatusUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = OrderService(db)
    order = await service.get_order(order_id)
    if not order or order.business_id != user.business_id:
        raise HTTPException(status_code=404, detail="Order not found")

    try:
        new_status = OrderStatus(data.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {data.status}")

    try:
        updated = await service.update_status(
            order_id, new_status, changed_by=str(user.id), reason=data.reason
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"order_ref": updated.order_ref, "status": updated.status.value}


@router.post("/{order_id}/cancel")
async def cancel_order(
    order_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = OrderService(db)
    order = await service.get_order(order_id)
    if not order or order.business_id != user.business_id:
        raise HTTPException(status_code=404, detail="Order not found")

    try:
        updated = await service.request_cancellation(
            order_id, changed_by=str(user.id)
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"order_ref": updated.order_ref, "status": updated.status.value}


def _serialize_order(order) -> dict:
    return {
        "id": order.id,
        "order_ref": order.order_ref,
        "status": order.status.value,
        "total_amount": order.total_amount,
        "currency": order.currency,
        "delivery_address": order.delivery_address,
        "notes": order.notes,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
        "items": [
            {
                "id": i.id,
                "product_name": i.product_name,
                "quantity": i.quantity,
                "unit_price": i.unit_price,
                "total_price": i.total_price,
            }
            for i in (order.items if order.items else [])
        ],
        "status_logs": [
            {
                "from_status": l.from_status,
                "to_status": l.to_status,
                "changed_by": l.changed_by,
                "reason": l.reason,
                "created_at": l.created_at,
            }
            for l in (order.status_logs if order.status_logs else [])
        ],
    }
