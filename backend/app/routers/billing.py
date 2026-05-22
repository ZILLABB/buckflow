"""
Billing Router — Paystack integration endpoints.
Handles subscription management, payment initialization, verification, and webhooks.
"""
import hashlib
import hmac
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.middleware.auth import get_current_user
from app.models.subscription import Plan, Subscription, SubscriptionStatus
from app.models.user import User
from app.services.paystack_service import PaystackService

settings = get_settings()
router = APIRouter(prefix="/billing", tags=["billing"])


class SubscribeRequest(BaseModel):
    plan_id: str
    callback_url: str | None = None


class VerifyRequest(BaseModel):
    reference: str


# ── Plans ──────────────────────────────────────────────────────

@router.get("/plans")
async def list_plans(
    db: AsyncSession = Depends(get_db),
):
    """List all available subscription plans."""
    result = await db.execute(
        select(Plan).where(Plan.is_active == True).order_by(Plan.price_naira)
    )
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
        }
        for p in plans
    ]


# ── Subscription Management ───────────────────────────────────

@router.get("/subscription")
async def get_subscription(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current subscription status for the user's business."""
    paystack = PaystackService(db)
    return await paystack.get_subscription_status(user.business_id)


@router.post("/subscribe")
async def subscribe(
    data: SubscribeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Initialize a Paystack payment to subscribe to a plan."""
    paystack = PaystackService(db)

    try:
        result = await paystack.initialize_subscription(
            business_id=user.business_id,
            plan_id=uuid.UUID(data.plan_id),
            email=user.email,
            callback_url=data.callback_url,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return result


@router.post("/verify")
async def verify_payment(
    data: VerifyRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Verify a Paystack transaction after payment callback."""
    paystack = PaystackService(db)

    try:
        result = await paystack.verify_transaction(data.reference)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return result


@router.post("/cancel")
async def cancel_subscription(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel the active subscription."""
    paystack = PaystackService(db)
    success = await paystack.cancel_subscription(user.business_id)
    if not success:
        raise HTTPException(status_code=404, detail="No active subscription found")
    return {"status": "cancelled"}


# ── Webhook ────────────────────────────────────────────────────

@router.post("/webhook/paystack")
async def paystack_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Handle Paystack webhook events.
    Paystack sends POST requests with event data signed with HMAC SHA512.
    """
    payload = await request.body()
    signature = request.headers.get("x-paystack-signature", "")

    # Verify signature
    if settings.paystack_secret_key:
        expected = hmac.HMAC(
            settings.paystack_secret_key.encode("utf-8"),
            payload,
            hashlib.sha512,
        ).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=401, detail="Invalid signature")

    body = await request.json()
    event = body.get("event", "")
    data = body.get("data", {})

    paystack = PaystackService(db)
    await paystack.handle_webhook(event, data)

    return {"status": "ok"}


# ── Payment History ────────────────────────────────────────────

@router.get("/history")
async def payment_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get subscription history for the business."""
    result = await db.execute(
        select(Subscription)
        .where(Subscription.business_id == user.business_id)
        .order_by(Subscription.created_at.desc())
    )
    subs = result.scalars().all()

    items = []
    for s in subs:
        plan = await db.scalar(select(Plan).where(Plan.id == s.plan_id))
        items.append({
            "id": str(s.id),
            "plan_name": plan.name if plan else "Unknown",
            "plan_tier": plan.tier.value if plan else None,
            "status": s.status.value,
            "period_start": s.current_period_start.isoformat() if s.current_period_start else None,
            "period_end": s.current_period_end.isoformat() if s.current_period_end else None,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        })
    return items
