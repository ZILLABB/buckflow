"""
Celery tasks for BuckFlow background processing.
"""

import asyncio
import structlog
from app.workers.celery_app import celery_app

logger = structlog.get_logger()


def _run_async(coro):
    """Helper to run async code from sync Celery tasks."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="app.workers.tasks.send_reminders")
def send_reminders():
    """Send appointment reminders (24h and 2h before)."""
    from app.workers.reminder_worker import run_reminder_check

    logger.info("celery_task_started", task="send_reminders")
    _run_async(run_reminder_check())
    logger.info("celery_task_completed", task="send_reminders")


@celery_app.task(name="app.workers.tasks.reset_monthly_usage")
def reset_monthly_usage():
    """Reset monthly conversation and AI usage counters for all businesses."""
    from sqlalchemy import update
    from app.core.database import engine
    from app.models.business import Business

    async def _reset():
        from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
        session_factory = async_sessionmaker(engine, expire_on_commit=False)
        async with session_factory() as db:
            await db.execute(
                update(Business).values(
                    conversations_used=0,
                    ai_messages_used=0,
                )
            )
            await db.commit()
            logger.info("monthly_usage_reset")

    _run_async(_reset())


@celery_app.task(name="app.workers.tasks.cleanup_stale_conversations")
def cleanup_stale_conversations():
    """Mark conversations inactive if no messages in 30 days."""
    from datetime import datetime, timezone, timedelta
    from sqlalchemy import update
    from app.models.conversation import Conversation

    async def _cleanup():
        from app.core.database import engine
        from sqlalchemy.ext.asyncio import async_sessionmaker
        session_factory = async_sessionmaker(engine, expire_on_commit=False)
        cutoff = datetime.now(timezone.utc) - timedelta(days=30)

        async with session_factory() as db:
            result = await db.execute(
                update(Conversation)
                .where(Conversation.updated_at < cutoff)
                .where(Conversation.is_active == True)
                .values(is_active=False)
            )
            await db.commit()
            logger.info("stale_conversations_cleaned", count=result.rowcount)

    _run_async(_cleanup())


@celery_app.task(name="app.workers.tasks.send_broadcast")
def send_broadcast(business_id: str, template_name: str, customer_ids: list[str]):
    """Send a WhatsApp broadcast message to a list of customers."""
    from sqlalchemy import select
    from app.models.customer import Customer
    from app.models.business import Business
    from app.whatsapp.client import WhatsAppClient

    async def _broadcast():
        from app.core.database import engine
        from sqlalchemy.ext.asyncio import async_sessionmaker
        session_factory = async_sessionmaker(engine, expire_on_commit=False)

        async with session_factory() as db:
            biz = await db.scalar(select(Business).where(Business.id == business_id))
            if not biz or not biz.whatsapp_verified:
                logger.warning("broadcast_skipped", business_id=business_id, reason="not verified")
                return

            client = WhatsAppClient(
                api_token=biz.whatsapp_api_token,
                phone_number_id=biz.whatsapp_phone_number_id,
            )

            sent = 0
            failed = 0
            for cid in customer_ids:
                customer = await db.scalar(
                    select(Customer).where(Customer.id == cid)
                )
                if not customer or not customer.phone:
                    failed += 1
                    continue

                try:
                    await client.send_template(customer.phone, template_name)
                    sent += 1
                except Exception as e:
                    failed += 1
                    logger.error("broadcast_send_failed", customer_id=cid, error=str(e))

            logger.info(
                "broadcast_completed",
                business_id=business_id,
                sent=sent,
                failed=failed,
            )

    _run_async(_broadcast())
