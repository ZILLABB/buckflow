from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis import get_redis
from app.middleware.auth import get_current_user
from app.models.conversation import Conversation
from app.models.customer import Customer
from app.models.message import Message, ResponseSource
from app.models.order import Order, OrderStatus
from app.models.usage_log import UsageLog
from app.models.user import User
from app.services.usage_limiter import UsageLimiter

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview")
async def get_overview(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    biz = user.business_id

    total_customers = await db.scalar(
        select(func.count(Customer.id)).where(Customer.business_id == biz)
    )
    total_conversations = await db.scalar(
        select(func.count(Conversation.id)).where(Conversation.business_id == biz)
    )
    total_orders = await db.scalar(
        select(func.count(Order.id)).where(Order.business_id == biz)
    )
    revenue = await db.scalar(
        select(func.coalesce(func.sum(Order.total_amount), 0)).where(
            Order.business_id == biz,
            Order.status.in_([
                OrderStatus.PAID, OrderStatus.PROCESSING,
                OrderStatus.SHIPPED, OrderStatus.DELIVERED,
            ]),
        )
    )

    return {
        "total_customers": total_customers or 0,
        "total_conversations": total_conversations or 0,
        "total_orders": total_orders or 0,
        "total_revenue": revenue or 0,
    }


@router.get("/usage")
async def get_usage(
    days: int = Query(30, le=90),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    redis_client = get_redis()
    limiter = UsageLimiter(db, redis_client)
    status = await limiter.check(user.business_id)

    today = date.today()
    from datetime import timedelta
    start = today - timedelta(days=days)

    result = await db.execute(
        select(UsageLog)
        .where(
            UsageLog.business_id == user.business_id,
            UsageLog.log_date >= start,
        )
        .order_by(UsageLog.log_date)
    )
    logs = result.scalars().all()

    return {
        "limits": {
            "conversations_used": status.conversations_used,
            "conversations_limit": status.conversations_limit,
            "ai_used": status.ai_used,
            "ai_limit": status.ai_limit,
            "ai_allowed": status.ai_allowed,
        },
        "daily": [
            {
                "date": str(l.log_date),
                "total_messages": l.total_messages,
                "rule_responses": l.rule_responses,
                "ai_mini_responses": l.ai_mini_responses,
                "ai_premium_responses": l.ai_premium_responses,
                "cache_hits": l.cache_hits,
                "human_responses": l.human_responses,
                "total_tokens": l.total_tokens,
            }
            for l in logs
        ],
    }


@router.get("/response-breakdown")
async def response_breakdown(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()
    first_of_month = today.replace(day=1)

    result = await db.execute(
        select(
            func.coalesce(func.sum(UsageLog.rule_responses), 0),
            func.coalesce(func.sum(UsageLog.ai_mini_responses), 0),
            func.coalesce(func.sum(UsageLog.ai_premium_responses), 0),
            func.coalesce(func.sum(UsageLog.cache_hits), 0),
            func.coalesce(func.sum(UsageLog.human_responses), 0),
        ).where(
            UsageLog.business_id == user.business_id,
            UsageLog.log_date >= first_of_month,
        )
    )
    row = result.one()
    return {
        "rule_engine": row[0],
        "ai_mini": row[1],
        "ai_premium": row[2],
        "cache": row[3],
        "human": row[4],
    }
