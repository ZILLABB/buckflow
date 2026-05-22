"""
Paystack Billing Integration Service.
Handles subscription initialization, verification, webhooks, and plan management.
"""
import hashlib
import hmac
import uuid
from datetime import datetime, timezone, timedelta

import httpx
import structlog
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.business import Business
from app.models.subscription import Plan, PlanTier, Subscription, SubscriptionStatus

logger = structlog.get_logger()
settings = get_settings()

PAYSTACK_BASE_URL = "https://api.paystack.co"


class PaystackService:
    """Handles all Paystack payment and subscription operations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.secret_key = settings.paystack_secret_key
        self.headers = {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json",
        }

    # ── Public Methods ──────────────────────────────────────────

    async def initialize_subscription(
        self,
        business_id: uuid.UUID,
        plan_id: uuid.UUID,
        email: str,
        callback_url: str | None = None,
    ) -> dict:
        """Initialize a Paystack transaction for a subscription."""
        plan = await self.db.scalar(select(Plan).where(Plan.id == plan_id))
        if not plan:
            raise ValueError("Plan not found")

        # Amount in kobo (Paystack uses kobo, i.e. Naira × 100)
        amount = plan.price_naira * 100

        payload = {
            "email": email,
            "amount": amount,
            "currency": "NGN",
            "metadata": {
                "business_id": str(business_id),
                "plan_id": str(plan_id),
                "plan_tier": plan.tier.value,
            },
            "channels": ["card", "bank", "ussd", "bank_transfer"],
        }
        if callback_url:
            payload["callback_url"] = callback_url

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{PAYSTACK_BASE_URL}/transaction/initialize",
                json=payload,
                headers=self.headers,
                timeout=30,
            )

        data = response.json()
        if not data.get("status"):
            logger.error("paystack_init_failed", error=data.get("message"))
            raise ValueError(data.get("message", "Payment initialization failed"))

        return {
            "authorization_url": data["data"]["authorization_url"],
            "access_code": data["data"]["access_code"],
            "reference": data["data"]["reference"],
        }

    async def verify_transaction(self, reference: str) -> dict:
        """Verify a Paystack transaction and activate subscription."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{PAYSTACK_BASE_URL}/transaction/verify/{reference}",
                headers=self.headers,
                timeout=30,
            )

        data = response.json()
        if not data.get("status"):
            logger.error("paystack_verify_failed", reference=reference)
            raise ValueError("Transaction verification failed")

        tx_data = data["data"]
        if tx_data["status"] != "success":
            return {"verified": False, "status": tx_data["status"]}

        metadata = tx_data.get("metadata", {})
        business_id = metadata.get("business_id")
        plan_id = metadata.get("plan_id")

        if business_id and plan_id:
            await self._activate_subscription(
                business_id=uuid.UUID(business_id),
                plan_id=uuid.UUID(plan_id),
                paystack_ref=reference,
                customer_code=tx_data.get("customer", {}).get("customer_code"),
            )

        return {
            "verified": True,
            "status": "success",
            "amount": tx_data["amount"] / 100,  # Convert kobo to Naira
            "business_id": business_id,
            "plan_id": plan_id,
        }

    async def handle_webhook(self, event: str, data: dict) -> None:
        """Handle Paystack webhook events."""
        handlers = {
            "charge.success": self._handle_charge_success,
            "subscription.create": self._handle_subscription_create,
            "subscription.disable": self._handle_subscription_disable,
            "invoice.payment_failed": self._handle_payment_failed,
        }

        handler = handlers.get(event)
        if handler:
            await handler(data)
        else:
            logger.info("paystack_webhook_unhandled", event=event)

    async def create_paystack_plan(self, plan: Plan) -> str | None:
        """Create a plan on Paystack (for recurring billing)."""
        payload = {
            "name": f"BuckFlow {plan.name}",
            "interval": "monthly",
            "amount": plan.price_naira * 100,  # kobo
            "currency": "NGN",
            "description": f"BuckFlow {plan.tier.value} plan - {plan.conversation_limit} conversations, {plan.ai_messages_limit} AI messages",
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{PAYSTACK_BASE_URL}/plan",
                json=payload,
                headers=self.headers,
                timeout=30,
            )

        data = response.json()
        if data.get("status"):
            return data["data"]["plan_code"]
        logger.error("paystack_plan_create_failed", error=data.get("message"))
        return None

    async def get_subscription_status(self, business_id: uuid.UUID) -> dict:
        """Get current subscription status for a business."""
        result = await self.db.execute(
            select(Subscription)
            .where(Subscription.business_id == business_id)
            .order_by(Subscription.created_at.desc())
            .limit(1)
        )
        sub = result.scalar_one_or_none()

        if not sub:
            return {
                "has_subscription": False,
                "status": "none",
                "plan": None,
            }

        plan = await self.db.scalar(select(Plan).where(Plan.id == sub.plan_id))

        return {
            "has_subscription": True,
            "status": sub.status.value,
            "plan": {
                "id": str(plan.id),
                "name": plan.name,
                "tier": plan.tier.value,
                "price_naira": plan.price_naira,
            } if plan else None,
            "current_period_start": sub.current_period_start.isoformat() if sub.current_period_start else None,
            "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
            "paystack_code": sub.paystack_subscription_code,
        }

    async def cancel_subscription(self, business_id: uuid.UUID) -> bool:
        """Cancel the active subscription for a business."""
        result = await self.db.execute(
            select(Subscription).where(
                Subscription.business_id == business_id,
                Subscription.status == SubscriptionStatus.ACTIVE,
            )
        )
        sub = result.scalar_one_or_none()
        if not sub:
            return False

        # If there's a Paystack subscription, disable it
        if sub.paystack_subscription_code:
            await self._disable_paystack_subscription(sub.paystack_subscription_code)

        sub.status = SubscriptionStatus.CANCELLED
        await self.db.flush()
        return True

    # ── Static Utility ──────────────────────────────────────────

    @staticmethod
    def verify_webhook_signature(payload: bytes, signature: str) -> bool:
        """Verify Paystack webhook signature using HMAC SHA512."""
        expected = hmac.HMAC(
            settings.paystack_secret_key.encode("utf-8"),
            payload,
            hashlib.sha512,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    # ── Private Methods ─────────────────────────────────────────

    async def _activate_subscription(
        self,
        business_id: uuid.UUID,
        plan_id: uuid.UUID,
        paystack_ref: str,
        customer_code: str | None = None,
    ) -> Subscription:
        """Create or update subscription after successful payment."""
        now = datetime.now(timezone.utc)
        period_end = now + timedelta(days=30)

        # Check for existing subscription
        result = await self.db.execute(
            select(Subscription).where(Subscription.business_id == business_id)
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.plan_id = plan_id
            existing.status = SubscriptionStatus.ACTIVE
            existing.current_period_start = now
            existing.current_period_end = period_end
            existing.paystack_subscription_code = paystack_ref
            sub = existing
        else:
            sub = Subscription(
                business_id=business_id,
                plan_id=plan_id,
                status=SubscriptionStatus.ACTIVE,
                current_period_start=now,
                current_period_end=period_end,
                paystack_subscription_code=paystack_ref,
            )
            self.db.add(sub)

        # Update business limits based on plan
        plan = await self.db.scalar(select(Plan).where(Plan.id == plan_id))
        if plan:
            await self.db.execute(
                update(Business)
                .where(Business.id == business_id)
                .values(
                    monthly_conversation_limit=plan.conversation_limit,
                    monthly_ai_limit=plan.ai_messages_limit,
                )
            )

        await self.db.flush()
        logger.info(
            "subscription_activated",
            business_id=str(business_id),
            plan_tier=plan.tier.value if plan else "unknown",
        )
        return sub

    async def _handle_charge_success(self, data: dict) -> None:
        """Handle successful charge (recurring payment)."""
        metadata = data.get("metadata", {})
        business_id = metadata.get("business_id")
        plan_id = metadata.get("plan_id")

        if business_id and plan_id:
            await self._activate_subscription(
                business_id=uuid.UUID(business_id),
                plan_id=uuid.UUID(plan_id),
                paystack_ref=data.get("reference", ""),
            )

    async def _handle_subscription_create(self, data: dict) -> None:
        """Handle subscription creation event."""
        logger.info("paystack_subscription_created", code=data.get("subscription_code"))

    async def _handle_subscription_disable(self, data: dict) -> None:
        """Handle subscription disable/cancellation."""
        sub_code = data.get("subscription_code")
        if sub_code:
            result = await self.db.execute(
                select(Subscription).where(
                    Subscription.paystack_subscription_code == sub_code
                )
            )
            sub = result.scalar_one_or_none()
            if sub:
                sub.status = SubscriptionStatus.CANCELLED
                await self.db.flush()
                logger.info("subscription_cancelled_via_webhook", code=sub_code)

    async def _handle_payment_failed(self, data: dict) -> None:
        """Handle failed invoice payment."""
        subscription = data.get("subscription", {})
        sub_code = subscription.get("subscription_code")
        if sub_code:
            result = await self.db.execute(
                select(Subscription).where(
                    Subscription.paystack_subscription_code == sub_code
                )
            )
            sub = result.scalar_one_or_none()
            if sub:
                sub.status = SubscriptionStatus.PAST_DUE
                await self.db.flush()
                logger.warning("payment_failed", code=sub_code)

    async def _disable_paystack_subscription(self, subscription_code: str) -> None:
        """Disable a subscription on Paystack."""
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{PAYSTACK_BASE_URL}/subscription/disable",
                    json={"code": subscription_code, "token": "email"},
                    headers=self.headers,
                    timeout=30,
                )
        except Exception as e:
            logger.error("paystack_disable_failed", error=str(e))
