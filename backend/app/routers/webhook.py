import structlog
from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
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
async def receive_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    body = await request.json()
    payload = WhatsAppWebhookPayload(**body)

    messages = normalize_webhook(payload)
    if not messages:
        return {"status": "ok"}

    processor = MessageProcessor(db)
    for msg in messages:
        try:
            await processor.process(msg)
        except Exception as e:
            logger.error("message_processing_failed", error=str(e), wa_id=msg.wa_message_id)

    return {"status": "ok"}
