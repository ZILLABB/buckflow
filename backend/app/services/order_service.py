import random
import string
import uuid

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.order import Order, OrderItem, OrderStatus, OrderStatusLog

logger = structlog.get_logger()

VALID_TRANSITIONS = {
    OrderStatus.CREATED: {OrderStatus.CONFIRMED, OrderStatus.CANCEL_REQUESTED, OrderStatus.CANCELLED},
    OrderStatus.CONFIRMED: {OrderStatus.PAID, OrderStatus.CANCEL_REQUESTED, OrderStatus.CANCELLED},
    OrderStatus.PAID: {OrderStatus.PROCESSING, OrderStatus.CANCEL_REQUESTED},
    OrderStatus.PROCESSING: {OrderStatus.SHIPPED},
    OrderStatus.SHIPPED: {OrderStatus.DELIVERED},
    OrderStatus.CANCEL_REQUESTED: {OrderStatus.CANCELLED, OrderStatus.PROCESSING},
    OrderStatus.CANCELLED: {OrderStatus.REFUND_PENDING},
    OrderStatus.REFUND_PENDING: set(),
    OrderStatus.DELIVERED: set(),
}


class OrderService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_order(
        self,
        business_id: uuid.UUID,
        customer_id: uuid.UUID,
        items: list[dict],
        delivery_address: str | None = None,
        conversation_id: uuid.UUID | None = None,
        notes: str | None = None,
    ) -> Order:
        order_ref = self._generate_ref()
        total = sum(item["quantity"] * item["unit_price"] for item in items)

        order = Order(
            business_id=business_id,
            customer_id=customer_id,
            conversation_id=conversation_id,
            order_ref=order_ref,
            status=OrderStatus.CREATED,
            total_amount=total,
            delivery_address=delivery_address,
            notes=notes,
        )
        self.db.add(order)
        await self.db.flush()

        for item in items:
            order_item = OrderItem(
                order_id=order.id,
                product_name=item["product_name"],
                quantity=item["quantity"],
                unit_price=item["unit_price"],
                total_price=item["quantity"] * item["unit_price"],
            )
            self.db.add(order_item)

        self._log_status_change(order.id, None, OrderStatus.CREATED, "system")
        await self.db.flush()
        logger.info("order_created", order_ref=order_ref, total=total)
        return order

    async def update_status(
        self,
        order_id: uuid.UUID,
        new_status: OrderStatus,
        changed_by: str,
        reason: str | None = None,
    ) -> Order:
        order = await self._get_order(order_id)
        if not order:
            raise ValueError("Order not found")

        if new_status not in VALID_TRANSITIONS.get(order.status, set()):
            raise ValueError(
                f"Cannot transition from {order.status.value} to {new_status.value}"
            )

        old_status = order.status
        order.status = new_status
        self._log_status_change(order.id, old_status, new_status, changed_by, reason)
        await self.db.flush()

        logger.info(
            "order_status_updated",
            order_ref=order.order_ref,
            from_status=old_status.value,
            to_status=new_status.value,
        )
        return order

    async def request_cancellation(
        self, order_id: uuid.UUID, changed_by: str, reason: str | None = None
    ) -> Order:
        order = await self._get_order(order_id)
        if not order:
            raise ValueError("Order not found")

        if order.status in {OrderStatus.SHIPPED, OrderStatus.DELIVERED}:
            raise ValueError("Cannot cancel shipped or delivered orders")

        if order.status in {OrderStatus.CREATED, OrderStatus.CONFIRMED}:
            return await self.update_status(
                order_id, OrderStatus.CANCELLED, changed_by, reason
            )

        if order.status == OrderStatus.PAID:
            return await self.update_status(
                order_id, OrderStatus.CANCEL_REQUESTED, changed_by, reason
            )

        raise ValueError(f"Cannot cancel order in {order.status.value} state")

    async def get_order(self, order_id: uuid.UUID) -> Order | None:
        return await self._get_order(order_id)

    async def get_order_by_ref(
        self, business_id: uuid.UUID, order_ref: str
    ) -> Order | None:
        result = await self.db.execute(
            select(Order)
            .options(selectinload(Order.items), selectinload(Order.status_logs))
            .where(Order.business_id == business_id, Order.order_ref == order_ref)
        )
        return result.scalar_one_or_none()

    async def list_orders(
        self,
        business_id: uuid.UUID,
        status: OrderStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Order]:
        stmt = (
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.business_id == business_id)
            .order_by(Order.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        if status:
            stmt = stmt.where(Order.status == status)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def _get_order(self, order_id: uuid.UUID) -> Order | None:
        result = await self.db.execute(
            select(Order)
            .options(selectinload(Order.items), selectinload(Order.status_logs))
            .where(Order.id == order_id)
        )
        return result.scalar_one_or_none()

    def _log_status_change(
        self,
        order_id: uuid.UUID,
        from_status: OrderStatus | None,
        to_status: OrderStatus,
        changed_by: str,
        reason: str | None = None,
    ) -> None:
        log = OrderStatusLog(
            order_id=order_id,
            from_status=from_status.value if from_status else None,
            to_status=to_status.value,
            changed_by=changed_by,
            reason=reason,
        )
        self.db.add(log)

    def _generate_ref(self) -> str:
        chars = string.ascii_uppercase + string.digits
        suffix = "".join(random.choices(chars, k=8))
        return f"BF-{suffix}"
