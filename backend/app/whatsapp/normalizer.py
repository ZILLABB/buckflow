from dataclasses import dataclass

from app.schemas.whatsapp import WhatsAppWebhookPayload


@dataclass
class NormalizedMessage:
    wa_message_id: str
    from_number: str
    sender_name: str
    phone_number_id: str
    text: str
    msg_type: str
    timestamp: str


def normalize_webhook(payload: WhatsAppWebhookPayload) -> list[NormalizedMessage]:
    messages = []
    if not payload.entry:
        return messages

    for entry in payload.entry:
        if not entry.changes:
            continue
        for change in entry.changes:
            if change.field != "messages" or not change.value:
                continue
            value = change.value
            phone_number_id = (
                value.metadata.phone_number_id if value.metadata else ""
            )
            contacts_map = {}
            if value.contacts:
                for c in value.contacts:
                    if c.wa_id and c.profile:
                        contacts_map[c.wa_id] = c.profile.name or ""

            if not value.messages:
                continue

            for msg in value.messages:
                if not msg.id or not msg.from_:
                    continue

                text = ""
                msg_type = msg.type or "text"
                if msg_type == "text" and msg.text:
                    text = msg.text.body

                messages.append(
                    NormalizedMessage(
                        wa_message_id=msg.id,
                        from_number=msg.from_,
                        sender_name=contacts_map.get(msg.from_, ""),
                        phone_number_id=phone_number_id,
                        text=text,
                        msg_type=msg_type,
                        timestamp=msg.timestamp or "",
                    )
                )
    return messages
