from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select, case, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.middleware.admin_auth import get_super_admin
from app.models.business import Business
from app.models.conversation import Conversation
from app.models.customer import Customer
from app.models.message import Message
from app.models.order import Order, OrderStatus
from app.models.subscription import Plan, Subscription, SubscriptionStatus
from app.models.usage_log import UsageLog
from app.models.user import User, UserRole
from app.models.ai_request import AIRequest

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Platform Overview ──────────────────────────────────────────
@router.get("/overview")
async def platform_overview(
    admin: User = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()
    first_of_month = today.replace(day=1)
    thirty_days_ago = today - timedelta(days=30)

    total_businesses = await db.scalar(select(func.count(Business.id))) or 0
    active_businesses = await db.scalar(
        select(func.count(Business.id)).where(Business.is_active == True)
    ) or 0
    total_users = await db.scalar(select(func.count(User.id))) or 0
    total_customers = await db.scalar(select(func.count(Customer.id))) or 0
    total_conversations = await db.scalar(select(func.count(Conversation.id))) or 0
    total_orders = await db.scalar(select(func.count(Order.id))) or 0

    total_revenue = await db.scalar(
        select(func.coalesce(func.sum(Order.total_amount), 0)).where(
            Order.status.in_([
                OrderStatus.PAID, OrderStatus.PROCESSING,
                OrderStatus.SHIPPED, OrderStatus.DELIVERED,
            ])
        )
    ) or 0

    monthly_messages = await db.scalar(
        select(func.coalesce(func.sum(UsageLog.total_messages), 0)).where(
            UsageLog.log_date >= first_of_month
        )
    ) or 0

    monthly_ai_cost = await db.scalar(
        select(func.coalesce(func.sum(UsageLog.total_cost_usd_cents), 0)).where(
            UsageLog.log_date >= first_of_month
        )
    ) or 0

    new_businesses_30d = await db.scalar(
        select(func.count(Business.id)).where(
            Business.created_at >= thirty_days_ago
        )
    ) or 0

    active_subscriptions = await db.scalar(
        select(func.count(Subscription.id)).where(
            Subscription.status == SubscriptionStatus.ACTIVE
        )
    ) or 0

    return {
        "total_businesses": total_businesses,
        "active_businesses": active_businesses,
        "new_businesses_30d": new_businesses_30d,
        "total_users": total_users,
        "total_customers": total_customers,
        "total_conversations": total_conversations,
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "monthly_messages": monthly_messages,
        "monthly_ai_cost_usd_cents": monthly_ai_cost,
        "active_subscriptions": active_subscriptions,
    }


# ── Platform Usage Chart ───────────────────────────────────────
@router.get("/usage-chart")
async def platform_usage_chart(
    days: int = Query(30, le=90),
    admin: User = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    start = date.today() - timedelta(days=days)
    result = await db.execute(
        select(
            UsageLog.log_date,
            func.sum(UsageLog.total_messages).label("messages"),
            func.sum(UsageLog.rule_responses).label("rule"),
            func.sum(UsageLog.ai_mini_responses).label("ai_mini"),
            func.sum(UsageLog.ai_premium_responses).label("ai_premium"),
            func.sum(UsageLog.cache_hits).label("cache"),
            func.sum(UsageLog.human_responses).label("human"),
            func.sum(UsageLog.total_tokens).label("tokens"),
            func.sum(UsageLog.total_cost_usd_cents).label("cost_cents"),
            func.count(func.distinct(UsageLog.business_id)).label("active_businesses"),
        )
        .where(UsageLog.log_date >= start)
        .group_by(UsageLog.log_date)
        .order_by(UsageLog.log_date)
    )
    rows = result.all()
    return [
        {
            "date": str(r.log_date),
            "messages": r.messages or 0,
            "rule": r.rule or 0,
            "ai_mini": r.ai_mini or 0,
            "ai_premium": r.ai_premium or 0,
            "cache": r.cache or 0,
            "human": r.human or 0,
            "tokens": r.tokens or 0,
            "cost_cents": r.cost_cents or 0,
            "active_businesses": r.active_businesses or 0,
        }
        for r in rows
    ]


# ── Response Breakdown (platform-wide) ────────────────────────
@router.get("/response-breakdown")
async def platform_response_breakdown(
    admin: User = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    first_of_month = date.today().replace(day=1)
    result = await db.execute(
        select(
            func.coalesce(func.sum(UsageLog.rule_responses), 0),
            func.coalesce(func.sum(UsageLog.ai_mini_responses), 0),
            func.coalesce(func.sum(UsageLog.ai_premium_responses), 0),
            func.coalesce(func.sum(UsageLog.cache_hits), 0),
            func.coalesce(func.sum(UsageLog.human_responses), 0),
        ).where(UsageLog.log_date >= first_of_month)
    )
    row = result.one()
    return {
        "rule_engine": row[0],
        "ai_mini": row[1],
        "ai_premium": row[2],
        "cache": row[3],
        "human": row[4],
    }


# ── Businesses CRUD ────────────────────────────────────────────
@router.get("/businesses")
async def list_businesses(
    search: str = Query("", max_length=100),
    status: str = Query("", max_length=20),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    admin: User = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    q = select(Business).order_by(Business.created_at.desc())
    if search:
        q = q.where(
            Business.name.ilike(f"%{search}%")
            | Business.slug.ilike(f"%{search}%")
            | Business.email.ilike(f"%{search}%")
        )
    if status == "active":
        q = q.where(Business.is_active == True)
    elif status == "inactive":
        q = q.where(Business.is_active == False)

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    result = await db.execute(q.offset(skip).limit(limit))
    businesses = result.scalars().all()

    items = []
    for b in businesses:
        user_count = await db.scalar(
            select(func.count(User.id)).where(User.business_id == b.id)
        )
        customer_count = await db.scalar(
            select(func.count(Customer.id)).where(Customer.business_id == b.id)
        )
        order_count = await db.scalar(
            select(func.count(Order.id)).where(Order.business_id == b.id)
        )
        items.append({
            "id": str(b.id),
            "name": b.name,
            "slug": b.slug,
            "email": b.email,
            "phone": b.phone,
            "is_active": b.is_active,
            "ai_enabled": b.ai_enabled,
            "whatsapp_connected": b.whatsapp_phone_number_id is not None,
            "monthly_ai_limit": b.monthly_ai_limit,
            "monthly_conversation_limit": b.monthly_conversation_limit,
            "user_count": user_count or 0,
            "customer_count": customer_count or 0,
            "order_count": order_count or 0,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        })

    return {"items": items, "total": total or 0}


@router.get("/businesses/{business_id}")
async def get_business_detail(
    business_id: str,
    admin: User = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Business).where(Business.id == business_id)
    )
    biz = result.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")

    users_result = await db.execute(
        select(User).where(User.business_id == biz.id)
    )
    users = users_result.scalars().all()

    customer_count = await db.scalar(
        select(func.count(Customer.id)).where(Customer.business_id == biz.id)
    ) or 0
    order_count = await db.scalar(
        select(func.count(Order.id)).where(Order.business_id == biz.id)
    ) or 0
    conv_count = await db.scalar(
        select(func.count(Conversation.id)).where(Conversation.business_id == biz.id)
    ) or 0
    revenue = await db.scalar(
        select(func.coalesce(func.sum(Order.total_amount), 0)).where(
            Order.business_id == biz.id,
            Order.status.in_([
                OrderStatus.PAID, OrderStatus.PROCESSING,
                OrderStatus.SHIPPED, OrderStatus.DELIVERED,
            ]),
        )
    ) or 0

    first_of_month = date.today().replace(day=1)
    monthly_msgs = await db.scalar(
        select(func.coalesce(func.sum(UsageLog.total_messages), 0)).where(
            UsageLog.business_id == biz.id,
            UsageLog.log_date >= first_of_month,
        )
    ) or 0
    monthly_ai = await db.scalar(
        select(func.coalesce(func.sum(UsageLog.ai_mini_responses + UsageLog.ai_premium_responses), 0)).where(
            UsageLog.business_id == biz.id,
            UsageLog.log_date >= first_of_month,
        )
    ) or 0

    return {
        "id": str(biz.id),
        "name": biz.name,
        "slug": biz.slug,
        "email": biz.email,
        "phone": biz.phone,
        "description": biz.description,
        "is_active": biz.is_active,
        "ai_enabled": biz.ai_enabled,
        "whatsapp_connected": biz.whatsapp_phone_number_id is not None,
        "ai_model": biz.ai_model,
        "monthly_ai_limit": biz.monthly_ai_limit,
        "monthly_conversation_limit": biz.monthly_conversation_limit,
        "created_at": biz.created_at.isoformat() if biz.created_at else None,
        "users": [
            {
                "id": str(u.id),
                "email": u.email,
                "full_name": u.full_name,
                "role": u.role.value,
                "is_active": u.is_active,
            }
            for u in users
        ],
        "stats": {
            "customers": customer_count,
            "orders": order_count,
            "conversations": conv_count,
            "revenue": revenue,
            "monthly_messages": monthly_msgs,
            "monthly_ai_calls": monthly_ai,
        },
    }


class BusinessUpdateAdmin(BaseModel):
    is_active: bool | None = None
    ai_enabled: bool | None = None
    monthly_ai_limit: int | None = None
    monthly_conversation_limit: int | None = None
    whatsapp_phone_number_id: str | None = None
    whatsapp_api_token: str | None = None


@router.patch("/businesses/{business_id}")
async def update_business_admin(
    business_id: str,
    data: BusinessUpdateAdmin,
    admin: User = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Business).where(Business.id == business_id))
    biz = result.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(biz, field, val)

    # Auto-set whatsapp_verified when admin assigns API credentials
    if "whatsapp_phone_number_id" in update_data and "whatsapp_api_token" in update_data:
        if update_data["whatsapp_phone_number_id"] and update_data["whatsapp_api_token"]:
            biz.whatsapp_verified = True
        else:
            biz.whatsapp_verified = False

    await db.flush()

    return {"status": "updated"}


# ── Users Management ───────────────────────────────────────────
@router.get("/users")
async def list_users(
    search: str = Query("", max_length=100),
    role: str = Query("", max_length=20),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    admin: User = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    q = select(User).order_by(User.created_at.desc())
    if search:
        q = q.where(
            User.email.ilike(f"%{search}%")
            | User.full_name.ilike(f"%{search}%")
        )
    if role:
        q = q.where(User.role == role)

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    result = await db.execute(q.offset(skip).limit(limit))
    users = result.scalars().all()

    items = []
    for u in users:
        biz_name = None
        if u.business_id:
            biz = await db.scalar(select(Business.name).where(Business.id == u.business_id))
            biz_name = biz
        items.append({
            "id": str(u.id),
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role.value,
            "is_active": u.is_active,
            "business_id": str(u.business_id) if u.business_id else None,
            "business_name": biz_name,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })

    return {"items": items, "total": total or 0}


class UserUpdateAdmin(BaseModel):
    is_active: bool | None = None
    role: str | None = None


@router.patch("/users/{user_id}")
async def update_user_admin(
    user_id: str,
    data: UserUpdateAdmin,
    admin: User = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.is_active is not None:
        user.is_active = data.is_active
    if data.role is not None:
        user.role = UserRole(data.role)
    await db.flush()

    return {"status": "updated"}


# ── Plans Management ───────────────────────────────────────────
@router.get("/plans")
async def list_plans(
    admin: User = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Plan).order_by(Plan.price_naira))
    plans = result.scalars().all()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "tier": p.tier.value,
            "price_naira": p.price_naira,
            "conversation_limit": p.conversation_limit,
            "ai_messages_limit": p.ai_messages_limit,
            "ai_model": p.ai_model,
            "rag_enabled": p.rag_enabled,
            "is_active": p.is_active,
        }
        for p in plans
    ]


class PlanUpdate(BaseModel):
    name: str | None = None
    price_naira: int | None = None
    conversation_limit: int | None = None
    ai_messages_limit: int | None = None
    ai_model: str | None = None
    rag_enabled: bool | None = None
    is_active: bool | None = None


@router.patch("/plans/{plan_id}")
async def update_plan(
    plan_id: str,
    data: PlanUpdate,
    admin: User = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    for field, val in data.model_dump(exclude_none=True).items():
        setattr(plan, field, val)
    await db.flush()

    return {"status": "updated"}


# ── Subscriptions ──────────────────────────────────────────────
@router.get("/subscriptions")
async def list_subscriptions(
    status_filter: str = Query("", alias="status", max_length=20),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    admin: User = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    q = select(Subscription).order_by(Subscription.created_at.desc())
    if status_filter:
        q = q.where(Subscription.status == status_filter)

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    result = await db.execute(q.offset(skip).limit(limit))
    subs = result.scalars().all()

    items = []
    for s in subs:
        biz_name = await db.scalar(select(Business.name).where(Business.id == s.business_id))
        plan_name = await db.scalar(select(Plan.name).where(Plan.id == s.plan_id))
        items.append({
            "id": str(s.id),
            "business_id": str(s.business_id),
            "business_name": biz_name,
            "plan_name": plan_name,
            "status": s.status.value,
            "current_period_start": s.current_period_start.isoformat() if s.current_period_start else None,
            "current_period_end": s.current_period_end.isoformat() if s.current_period_end else None,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        })

    return {"items": items, "total": total or 0}


# ── AI Cost Analytics ──────────────────────────────────────────
@router.get("/ai-costs")
async def ai_cost_analytics(
    days: int = Query(30, le=90),
    admin: User = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    start = date.today() - timedelta(days=days)
    result = await db.execute(
        select(
            UsageLog.log_date,
            func.sum(UsageLog.total_tokens).label("tokens"),
            func.sum(UsageLog.total_cost_usd_cents).label("cost_cents"),
            func.sum(UsageLog.ai_mini_responses).label("ai_mini"),
            func.sum(UsageLog.ai_premium_responses).label("ai_premium"),
        )
        .where(UsageLog.log_date >= start)
        .group_by(UsageLog.log_date)
        .order_by(UsageLog.log_date)
    )
    rows = result.all()

    total_cost = sum(r.cost_cents or 0 for r in rows)
    total_tokens = sum(r.tokens or 0 for r in rows)

    return {
        "total_cost_usd_cents": total_cost,
        "total_tokens": total_tokens,
        "daily": [
            {
                "date": str(r.log_date),
                "tokens": r.tokens or 0,
                "cost_cents": r.cost_cents or 0,
                "ai_mini": r.ai_mini or 0,
                "ai_premium": r.ai_premium or 0,
            }
            for r in rows
        ],
    }


# ── Top Businesses by usage ───────────────────────────────────
@router.get("/top-businesses")
async def top_businesses(
    metric: str = Query("messages", regex="^(messages|orders|revenue|ai_cost)$"),
    limit: int = Query(10, le=50),
    admin: User = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    first_of_month = date.today().replace(day=1)

    if metric == "messages":
        q = (
            select(
                Business.id, Business.name, Business.slug,
                func.coalesce(func.sum(UsageLog.total_messages), 0).label("value"),
            )
            .join(UsageLog, UsageLog.business_id == Business.id, isouter=True)
            .where(UsageLog.log_date >= first_of_month)
            .group_by(Business.id, Business.name, Business.slug)
            .order_by(func.sum(UsageLog.total_messages).desc().nulls_last())
            .limit(limit)
        )
    elif metric == "orders":
        q = (
            select(
                Business.id, Business.name, Business.slug,
                func.count(Order.id).label("value"),
            )
            .join(Order, Order.business_id == Business.id, isouter=True)
            .group_by(Business.id, Business.name, Business.slug)
            .order_by(func.count(Order.id).desc())
            .limit(limit)
        )
    elif metric == "revenue":
        q = (
            select(
                Business.id, Business.name, Business.slug,
                func.coalesce(func.sum(Order.total_amount), 0).label("value"),
            )
            .join(Order, Order.business_id == Business.id, isouter=True)
            .where(Order.status.in_([
                OrderStatus.PAID, OrderStatus.PROCESSING,
                OrderStatus.SHIPPED, OrderStatus.DELIVERED,
            ]))
            .group_by(Business.id, Business.name, Business.slug)
            .order_by(func.sum(Order.total_amount).desc().nulls_last())
            .limit(limit)
        )
    else:
        q = (
            select(
                Business.id, Business.name, Business.slug,
                func.coalesce(func.sum(UsageLog.total_cost_usd_cents), 0).label("value"),
            )
            .join(UsageLog, UsageLog.business_id == Business.id, isouter=True)
            .where(UsageLog.log_date >= first_of_month)
            .group_by(Business.id, Business.name, Business.slug)
            .order_by(func.sum(UsageLog.total_cost_usd_cents).desc().nulls_last())
            .limit(limit)
        )

    result = await db.execute(q)
    rows = result.all()
    return [
        {
            "id": str(r.id),
            "name": r.name,
            "slug": r.slug,
            "value": r.value or 0,
        }
        for r in rows
    ]


# ── Churn & Growth Metrics ────────────────────────────────────
@router.get("/growth-metrics")
async def growth_metrics(
    admin: User = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Platform growth and churn metrics for the super admin dashboard."""
    today = date.today()
    thirty_days_ago = today - timedelta(days=30)
    sixty_days_ago = today - timedelta(days=60)

    # New businesses this month vs last month
    new_this_month = await db.scalar(
        select(func.count(Business.id)).where(
            Business.created_at >= thirty_days_ago
        )
    ) or 0
    new_last_month = await db.scalar(
        select(func.count(Business.id)).where(
            and_(
                Business.created_at >= sixty_days_ago,
                Business.created_at < thirty_days_ago,
            )
        )
    ) or 0

    # Active businesses (sent at least 1 message in last 30 days)
    active_biz = await db.scalar(
        select(func.count(func.distinct(UsageLog.business_id))).where(
            UsageLog.log_date >= thirty_days_ago
        )
    ) or 0

    total_biz = await db.scalar(select(func.count(Business.id))) or 0

    # Churn rate = (inactive businesses / total) * 100
    churn_rate = (
        round(((total_biz - active_biz) / total_biz) * 100, 1)
        if total_biz > 0
        else 0
    )

    # Growth rate = ((new_this - new_last) / new_last) * 100
    growth_rate = (
        round(((new_this_month - new_last_month) / new_last_month) * 100, 1)
        if new_last_month > 0
        else 100.0 if new_this_month > 0 else 0
    )

    # Average messages per active business
    total_msgs = await db.scalar(
        select(func.coalesce(func.sum(UsageLog.total_messages), 0)).where(
            UsageLog.log_date >= thirty_days_ago
        )
    ) or 0
    avg_msgs = round(total_msgs / active_biz, 1) if active_biz > 0 else 0

    # Revenue metrics
    total_active_subs = await db.scalar(
        select(func.count(Subscription.id)).where(
            Subscription.status == SubscriptionStatus.ACTIVE
        )
    ) or 0

    return {
        "new_businesses_30d": new_this_month,
        "new_businesses_prev_30d": new_last_month,
        "growth_rate_pct": growth_rate,
        "active_businesses_30d": active_biz,
        "total_businesses": total_biz,
        "churn_rate_pct": churn_rate,
        "avg_messages_per_business": avg_msgs,
        "active_subscriptions": total_active_subs,
    }


# ── System Health ──────────────────────────────────────────────
@router.get("/health")
async def system_health(
    admin: User = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    from app.core.redis import get_redis

    db_ok = True
    try:
        await db.execute(select(func.count(Business.id)))
    except Exception:
        db_ok = False

    redis_ok = True
    try:
        r = get_redis()
        await r.ping()
    except Exception:
        redis_ok = False

    # Check how many businesses have WhatsApp configured
    wa_connected = await db.scalar(
        select(func.count(Business.id)).where(
            Business.whatsapp_phone_number_id.isnot(None),
            Business.whatsapp_verified == True,
        )
    ) or 0

    return {
        "database": "healthy" if db_ok else "unhealthy",
        "redis": "healthy" if redis_ok else "unhealthy",
        "whatsapp_connected_businesses": wa_connected,
        "status": "healthy" if (db_ok and redis_ok) else "degraded",
    }
