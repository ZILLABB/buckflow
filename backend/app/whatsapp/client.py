import httpx
import structlog

from app.core.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


class WhatsAppClient:
    def __init__(self, phone_number_id: str | None = None, api_token: str | None = None):
        self.phone_number_id = phone_number_id or settings.whatsapp_phone_number_id
        self.api_token = api_token or settings.whatsapp_api_token
        self.base_url = f"{settings.whatsapp_api_url}/{self.phone_number_id}/messages"

    async def send_text(self, to: str, text: str) -> dict | None:
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "text",
            "text": {"preview_url": False, "body": text},
        }
        return await self._send(payload)

    async def mark_as_read(self, message_id: str) -> None:
        payload = {
            "messaging_product": "whatsapp",
            "status": "read",
            "message_id": message_id,
        }
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(
                    self.base_url,
                    json=payload,
                    headers=self._headers(),
                )
        except Exception:
            logger.warning("failed_to_mark_read", message_id=message_id)

    async def _send(self, payload: dict) -> dict | None:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    self.base_url,
                    json=payload,
                    headers=self._headers(),
                )
                resp.raise_for_status()
                data = resp.json()
                logger.info("whatsapp_message_sent", to=payload.get("to"))
                return data
        except httpx.HTTPStatusError as e:
            logger.error(
                "whatsapp_send_failed",
                status=e.response.status_code,
                body=e.response.text,
            )
            return None
        except Exception as e:
            logger.error("whatsapp_send_error", error=str(e))
            return None

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
        }
