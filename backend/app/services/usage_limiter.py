import uuid
from dataclasses import dataclass
from datetime import date, datetime, timezone

import structlog
import redis.asyncio as redis
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_request import AIRequest
from app.models.business import Business
from app.models.message import Message, ResponseSource
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.usage_log import UsageLog

logger = structlog.get_logger()

RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_PREFIX = "bf:rate:"


@dataclass
class UsageStatus:
    allowed: bool
    reason: str | None = None
    ai_allowed: bool = True
    ai_model: str = "gpt-4o-mini"
    model_override: str | None = None
    conversations_used: int = 0
    conversations_limit: int = 0
    ai_used: int = 0
    ai_limit: int = 0


class UsageLimiter:
    def __init__(self, db: AsyncSession, redis_client: redis.Redis):
        self.db = db
        self.redis = redis_client

    async def check(self, business_id: uuid.UUID) -> UsageStatus:
        business = await self._get_business(business_id)
        if not business or not business.is_active:
            return UsageStatus(allowed=False, reason="Business inactive")

        today = date.today()
        usage = await self._get_today_usage(business_id, today)

        conversations_used = usage.conversations_started if usage else 0
        ai_used = (
            (usage.ai_mini_responses + usage.ai_premium_responses) if usage else 0
        )

        conv_limit = business.monthly_conversation_limit
        ai_limit = business.monthly_ai_limit

        monthly_usage = await self._get_monthly_usage(business_id)
        monthly_convos = monthly_usage.get("conversations", 0)
        monthly_ai = monthly_usage.get("ai_calls", 0)

        # Read the business's assigned AI model
        biz_model = business.ai_model or "gpt-4o-mini"

        if monthly_convos >= conv_limit:
            return UsageStatus(
                allowed=False,
                reason="Monthly conversation limit reached",
                ai_model=biz_model,
                conversations_used=monthly_convos,
                conversations_limit=conv_limit,
            )

        if monthly_ai >= ai_limit:
            return UsageStatus(
                allowed=True,
                ai_allowed=False,
                ai_model=biz_model,
                reason="AI limit reached — rule engine only",
                ai_used=monthly_ai,
                ai_limit=ai_limit,
                conversations_used=monthly_convos,
                conversations_limit=conv_limit,
            )

        # If usage is above 80%, downgrade to mini to stretch budget
        model_override = None
        if ai_limit > 0 and monthly_ai / ai_limit > 0.8:
            model_override = "gpt-4o-mini"

        return UsageStatus(
            allowed=True,
            ai_allowed=True,
            ai_model=biz_model,
            model_override=model_override,
            conversations_used=monthly_convos,
            conversations_limit=conv_limit,
            ai_used=monthly_ai,
            ai_limit=ai_limit,
        )

    async def check_rate_limit(
        self, business_id: uuid.UUID, max_per_minute: int = 30
    ) -> bool:
        key = f"{RATE_LIMIT_PREFIX}{business_id}"
        try:
            current = await self.redis.incr(key)
            if current == 1:
                await self.redis.expire(key, RATE_LIMIT_WINDOW)
            return current <= max_per_minute
        except Exception:
            return True

    async def _get_business(self, business_id: uuid.UUID) -> Business | None:
        result = await self.db.execute(
            select(Business).where(Business.id == business_id)
        )
        return result.scalar_one_or_none()

    async def _get_today_usage(
        self, business_id: uuid.UUID, today: date
    ) -> UsageLog | None:
        result = await self.db.execute(
            select(UsageLog).where(
                UsageLog.business_id == business_id,
                UsageLog.log_date == today,
            )
        )
        return result.scalar_one_or_none()

    async def _get_monthly_usage(self, business_id: uuid.UUID) -> dict:
        today = date.today()
        first_of_month = today.replace(day=1)
        result = await self.db.execute(
            select(
                func.coalesce(func.sum(UsageLog.conversations_started), 0).label("conversations"),
                func.coalesce(
                    func.sum(UsageLog.ai_mini_responses + UsageLog.ai_premium_responses), 0
                ).label("ai_calls"),
                func.coalesce(func.sum(UsageLog.total_tokens), 0).label("tokens"),
                func.coalesce(func.sum(UsageLog.total_cost_usd_cents), 0).label("cost"),
            ).where(
                UsageLog.business_id == business_id,
                UsageLog.log_date >= first_of_month,
            )
        )
        row = result.one()
        return {
            "conversations": row.conversations,
            "ai_calls": row.ai_calls,
            "tokens": row.tokens,
            "cost_cents": row.cost,
        }
