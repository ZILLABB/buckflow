import uuid

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversion import ConversionEvent, ConversionType
from app.models.conversation import Conversation
from app.models.order import Order, OrderStatus


class ConversionTracker:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def track_order_conversion(
        self,
        business_id: uuid.UUID,
        conversation_id: uuid.UUID,
        customer_id: uuid.UUID,
        order_id: uuid.UUID,
        revenue: int,
    ) -> ConversionEvent:
        event = ConversionEvent(
            business_id=business_id,
            conversation_id=conversation_id,
            customer_id=customer_id,
            conversion_type=ConversionType.ORDER,
            order_id=order_id,
            revenue_amount=revenue,
        )
        self.db.add(event)
        await self.db.flush()
        return event

    async def get_conversion_stats(self, business_id: uuid.UUID) -> dict:
        """Get conversion analytics for a business."""
        total_conversations = await self.db.scalar(
            select(func.count(Conversation.id)).where(
                Conversation.business_id == business_id
            )
        ) or 0

        total_conversions = await self.db.scalar(
            select(func.count(ConversionEvent.id)).where(
                ConversionEvent.business_id == business_id
            )
        ) or 0

        order_conversions = await self.db.scalar(
            select(func.count(ConversionEvent.id)).where(
                ConversionEvent.business_id == business_id,
                ConversionEvent.conversion_type == ConversionType.ORDER,
            )
        ) or 0

        booking_conversions = await self.db.scalar(
            select(func.count(ConversionEvent.id)).where(
                ConversionEvent.business_id == business_id,
                ConversionEvent.conversion_type == ConversionType.BOOKING,
            )
        ) or 0

        total_conversion_revenue = await self.db.scalar(
            select(func.coalesce(func.sum(ConversionEvent.revenue_amount), 0)).where(
                ConversionEvent.business_id == business_id
            )
        ) or 0

        conversion_rate = (
            round((total_conversions / total_conversations) * 100, 1)
            if total_conversations > 0
            else 0
        )

        return {
            "total_conversations": total_conversations,
            "total_conversions": total_conversions,
            "order_conversions": order_conversions,
            "booking_conversions": booking_conversions,
            "conversion_rate": conversion_rate,
            "total_conversion_revenue": total_conversion_revenue,
        }
