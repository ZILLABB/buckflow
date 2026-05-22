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

    async def send_template(
        self,
        to: str,
        template_name: str,
        language_code: str = "en",
        components: list[dict] | None = None,
    ) -> dict | None:
        """
        Send a WhatsApp template message.

        Args:
            to: Recipient phone number
            template_name: Pre-approved template name
            language_code: Template language (default: en)
            components: Template components with parameters
                Example: [{"type": "body", "parameters": [{"type": "text", "text": "John"}]}]
        """
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code},
            },
        }
        if components:
            payload["template"]["components"] = components
        return await self._send(payload)

    async def send_interactive_buttons(
        self,
        to: str,
        body_text: str,
        buttons: list[dict],
        header: str | None = None,
        footer: str | None = None,
    ) -> dict | None:
        """
        Send interactive button message (max 3 buttons).

        Args:
            buttons: [{"id": "btn_1", "title": "Confirm"}, ...]
        """
        action_buttons = [
            {"type": "reply", "reply": {"id": b["id"], "title": b["title"][:20]}}
            for b in buttons[:3]
        ]
        interactive = {
            "type": "button",
            "body": {"text": body_text},
            "action": {"buttons": action_buttons},
        }
        if header:
            interactive["header"] = {"type": "text", "text": header}
        if footer:
            interactive["footer"] = {"text": footer}

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "interactive",
            "interactive": interactive,
        }
        return await self._send(payload)

    async def send_interactive_list(
        self,
        to: str,
        body_text: str,
        button_text: str,
        sections: list[dict],
        header: str | None = None,
        footer: str | None = None,
    ) -> dict | None:
        """
        Send interactive list message.

        Args:
            sections: [{"title": "Section", "rows": [{"id": "1", "title": "Option", "description": "..."}]}]
        """
        interactive = {
            "type": "list",
            "body": {"text": body_text},
            "action": {"button": button_text, "sections": sections},
        }
        if header:
            interactive["header"] = {"type": "text", "text": header}
        if footer:
            interactive["footer"] = {"text": footer}

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "interactive",
            "interactive": interactive,
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
