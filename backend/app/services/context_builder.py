"""
Context Builder — Builds rich, data-grounded AI prompts for each business.

Instead of sending a blind "you are a helpful assistant" prompt, this service
queries real business data from the database and injects it into the system
prompt so the AI knows exactly what the business sells, their prices, hours,
policies, and who it's talking to.
"""
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

import structlog
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import ServiceItem
from app.models.business import Business, BusinessType
from app.models.conversation import Conversation
from app.models.customer import Customer
from app.models.message import Message, MessageDirection
from app.models.order import Order

logger = structlog.get_logger()

# Day name mapping for operating hours display
DAY_LABELS = {
    "mon": "Monday",
    "tue": "Tuesday",
    "wed": "Wednesday",
    "thu": "Thursday",
    "fri": "Friday",
    "sat": "Saturday",
    "sun": "Sunday",
}


class ContextBuilder:
    """Builds a fully enriched system prompt + conversation history for the AI."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def build_system_prompt(
        self,
        business: Business,
        customer: Customer,
        conversation: Conversation,
    ) -> str:
        """
        Build a structured system prompt with real business data.

        Sections:
        1. Identity — who the AI is and who it works for
        2. Business info — type, category, description
        3. Operating hours — from the business config
        4. Products/services & prices — from the database
        5. Customer context — name, history, tags
        6. Owner's custom instructions — the ai_system_prompt field
        7. Hard rules — anti-hallucination, formatting, behavior
        """
        sections = []

        # ── 1. Identity ──
        sections.append(self._build_identity(business))

        # ── 2. Business info ──
        sections.append(self._build_business_info(business))

        # ── 3. Operating hours ──
        hours_section = self._build_hours(business)
        if hours_section:
            sections.append(hours_section)

        # ── 4. Products/services & prices ──
        catalog_section = await self._build_catalog(business)
        if catalog_section:
            sections.append(catalog_section)

        # ── 5. Customer context ──
        customer_section = await self._build_customer_context(
            business, customer, conversation
        )
        sections.append(customer_section)

        # ── 6. Owner's custom instructions ──
        if business.ai_system_prompt:
            sections.append(
                "BUSINESS OWNER'S CUSTOM INSTRUCTIONS:\n"
                f"{business.ai_system_prompt}"
            )

        # ── 7. Hard rules ──
        sections.append(self._build_rules(business))

        return "\n\n".join(sections)

    async def build_conversation_history(
        self,
        conversation_id: uuid.UUID,
        limit: int = 10,
    ) -> list[dict]:
        """
        Fetch the last N messages and format them as OpenAI chat messages.
        Returns a list of {"role": "user"/"assistant", "content": "..."} dicts.
        """
        result = await self.db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        messages = list(result.scalars().all())
        messages.reverse()  # oldest first

        history = []
        for msg in messages:
            role = "user" if msg.direction == MessageDirection.INBOUND else "assistant"
            history.append({"role": role, "content": msg.content})

        return history

    # ── Section Builders ──────────────────────────────────────────

    def _build_identity(self, business: Business) -> str:
        biz_type_label = {
            BusinessType.PRODUCT: "a product/retail",
            BusinessType.SERVICE: "a service/bookings",
            BusinessType.HYBRID: "a product and service",
        }.get(business.business_type, "a")

        return (
            f"You are the AI assistant for {business.name}, "
            f"{biz_type_label} business in Nigeria.\n"
            f"You are chatting with customers on WhatsApp on behalf of this business.\n"
            f"Always represent {business.name} professionally and helpfully."
        )

    def _build_business_info(self, business: Business) -> str:
        lines = ["ABOUT THIS BUSINESS:"]
        lines.append(f"- Name: {business.name}")
        lines.append(
            f"- Type: {business.business_type.value.title()}"
        )
        lines.append(
            f"- Category: {business.category.value.replace('_', ' ').title()}"
        )
        if business.description:
            lines.append(f"- Description: {business.description}")
        return "\n".join(lines)

    def _build_hours(self, business: Business) -> str | None:
        if not business.operating_hours:
            return None

        tz_name = business.timezone or "Africa/Lagos"
        lines = [f"OPERATING HOURS (timezone: {tz_name}):"]

        for day_key, day_label in DAY_LABELS.items():
            day_data = business.operating_hours.get(day_key)
            if day_data:
                lines.append(
                    f"- {day_label}: {day_data['open']} - {day_data['close']}"
                )
            else:
                lines.append(f"- {day_label}: Closed")

        # Show current status
        try:
            now = datetime.now(ZoneInfo(tz_name))
            today_key = now.strftime("%a").lower()
            today_data = business.operating_hours.get(today_key)
            if today_data:
                open_t = datetime.strptime(today_data["open"], "%H:%M").time()
                close_t = datetime.strptime(today_data["close"], "%H:%M").time()
                is_open = open_t <= now.time() <= close_t
                lines.append(
                    f"- Current status: {'OPEN' if is_open else 'CLOSED'} "
                    f"(it is currently {now.strftime('%I:%M %p %A')})"
                )
            else:
                lines.append(
                    f"- Current status: CLOSED (it is currently {now.strftime('%A')})"
                )
        except Exception:
            pass

        return "\n".join(lines)

    async def _build_catalog(self, business: Business) -> str | None:
        """Fetch services/products from the service_items table."""
        result = await self.db.execute(
            select(ServiceItem)
            .where(
                ServiceItem.business_id == business.id,
                ServiceItem.is_active == True,
            )
            .order_by(ServiceItem.category.nullslast(), ServiceItem.name)
        )
        items = result.scalars().all()

        if not items:
            return None

        # Determine header based on business type
        if business.business_type == BusinessType.SERVICE:
            header = "SERVICES & PRICES:"
        elif business.business_type == BusinessType.PRODUCT:
            header = "PRODUCTS & PRICES:"
        else:
            header = "PRODUCTS/SERVICES & PRICES:"

        lines = [header]
        current_category = None

        for item in items:
            # Group by category
            cat = item.category or "General"
            if cat != current_category:
                current_category = cat
                lines.append(f"\n  [{cat.title()}]")

            price_str = f"₦{item.price:,}" if item.price > 0 else "Free"
            duration_str = f" ({item.duration_mins} min)" if item.duration_mins else ""
            desc_str = f" — {item.description}" if item.description else ""

            lines.append(f"  • {item.name}: {price_str}{duration_str}{desc_str}")

        lines.append(
            f"\nTotal: {len(items)} active item(s) in catalog."
        )

        return "\n".join(lines)

    async def _build_customer_context(
        self,
        business: Business,
        customer: Customer,
        conversation: Conversation,
    ) -> str:
        """Build customer context — name, order history, tags."""
        lines = ["CUSTOMER CONTEXT:"]

        name = customer.name or "Unknown"
        lines.append(f"- Name: {name}")

        if customer.tags:
            lines.append(f"- Tags: {', '.join(customer.tags)}")

        if customer.is_flagged:
            lines.append("- ⚠️ This customer has been flagged by the team")

        # Order count
        order_count = await self.db.scalar(
            select(func.count(Order.id)).where(
                Order.customer_id == customer.id,
                Order.business_id == business.id,
            )
        ) or 0

        if order_count > 0:
            lines.append(f"- Previous orders: {order_count}")

        # Check if returning customer (has previous conversations)
        msg_count = await self.db.scalar(
            select(func.count(Message.id)).where(
                Message.conversation_id == conversation.id,
            )
        ) or 0

        if msg_count > 2:
            lines.append(f"- This is an ongoing conversation ({msg_count} messages)")
        else:
            lines.append("- This appears to be a new conversation")

        return "\n".join(lines)

    def _build_rules(self, business: Business) -> str:
        """Hard rules that prevent hallucination and enforce behavior."""
        rules = [
            "IMPORTANT RULES — YOU MUST FOLLOW THESE:",
            "1. Always quote prices in Nigerian Naira (₦).",
            "2. NEVER invent or guess prices — only use prices listed above in the catalog.",
            "3. If a customer asks about a product/service not in your catalog, say "
            '"I\'ll confirm that with the team and get back to you."',
            "4. NEVER make up business policies, return policies, or guarantees.",
            "5. Keep responses concise — under 150 words. WhatsApp messages should be short.",
            "6. Be warm, friendly, and professional. Use simple English.",
            "7. If the customer greets you, greet them back by name if you know it.",
        ]

        # Business-type specific rules
        if business.business_type in (BusinessType.SERVICE, BusinessType.HYBRID):
            rules.append(
                "8. For bookings: confirm the service name, preferred date/time, "
                "and let them know the team will confirm availability."
            )

        if business.business_type in (BusinessType.PRODUCT, BusinessType.HYBRID):
            rules.append(
                "9. For orders: confirm items, quantities, and ask for "
                "delivery address if not provided."
            )

        rules.append(
            "10. If you're unsure about anything, say so honestly. "
            "Never fabricate information."
        )

        return "\n".join(rules)
