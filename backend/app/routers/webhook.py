import structlog
from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.middleware.rate_limiter import limiter, WEBHOOK_LIMIT
from app.schemas.whatsapp import WhatsAppWebhookPayload
from app.services.message_processor import MessageProcessor
from app.whatsapp.normalizer import normalize_webhook

router = APIRouter(prefix="/webhook", tags=["webhook"])
logger = structlog.get_logger()
settings = get_settings()


@router.get("/whatsapp")
async def verify_webhook(
    mode: str = Query(alias="hub.mode", default=""),
    token: str = Query(alias="hub.verify_token", default=""),
    challenge: str = Query(alias="hub.challenge", default=""),
):
    if mode == "subscribe" and token == settings.whatsapp_verify_token:
        logger.info("webhook_verified")
        return Response(content=challenge, media_type="text/plain")
    logger.warning("webhook_verification_failed", mode=mode)
    return Response(content="Forbidden", status_code=403)


@router.post("/whatsapp")
@limiter.limit(WEBHOOK_LIMIT)
async def receive_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    body = await request.json()
    logger.info("webhook_received", body_keys=list(body.keys()))

    try:
        payload = WhatsAppWebhookPayload(**body)
    except Exception as e:
        logger.error("webhook_parse_error", error=str(e))
        return {"status": "error", "detail": "Invalid payload"}

    messages = normalize_webhook(payload)
    if not messages:
        return {"status": "ok", "messages_processed": 0}

    processed = 0
    errors = 0
    processor = MessageProcessor(db)
    for msg in messages:
        try:
            await processor.process(msg)
            processed += 1
        except Exception as e:
            errors += 1
            logger.error(
                "message_processing_failed",
                error=str(e),
                wa_id=msg.wa_message_id,
            )

    logger.info(
        "webhook_completed",
        processed=processed,
        errors=errors,
    )
    return {"status": "ok", "messages_processed": processed, "errors": errors}


@router.post("/paystack")
@limiter.limit(WEBHOOK_LIMIT)
async def paystack_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Paystack payment webhooks.
    Verifies signature and processes subscription events.
    """
    from app.core.security import verify_webhook_signature

    body = await request.body()
    signature = request.headers.get("x-paystack-signature", "")

    if not verify_webhook_signature(body, signature, settings.paystack_secret_key):
        logger.warning("paystack_invalid_signature")
        return Response(content="Invalid signature", status_code=403)

    import json
    event = json.loads(body)
    event_type = event.get("event", "")
    data = event.get("data", {})

    logger.info("paystack_webhook", event=event_type)

    if event_type == "charge.success":
        reference = data.get("reference")
        if reference:
            from app.services.paystack_service import PaystackService
            service = PaystackService(db)
            try:
                await service.confirm_payment(reference)
                logger.info("payment_confirmed", reference=reference)
            except Exception as e:
                logger.error("payment_confirmation_failed", reference=reference, error=str(e))

    elif event_type == "subscription.disable":
        subscription_code = data.get("subscription_code")
        logger.info("subscription_disabled", code=subscription_code)

    return {"status": "ok"}
