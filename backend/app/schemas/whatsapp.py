from pydantic import BaseModel


class WhatsAppTextMessage(BaseModel):
    body: str


class WhatsAppMessage(BaseModel):
    from_: str | None = None
    id: str | None = None
    timestamp: str | None = None
    text: WhatsAppTextMessage | None = None
    type: str | None = None

    class Config:
        populate_by_name = True


class WhatsAppProfile(BaseModel):
    name: str | None = None


class WhatsAppContact(BaseModel):
    profile: WhatsAppProfile | None = None
    wa_id: str | None = None


class WhatsAppMetadata(BaseModel):
    display_phone_number: str | None = None
    phone_number_id: str | None = None


class WhatsAppValue(BaseModel):
    messaging_product: str | None = None
    metadata: WhatsAppMetadata | None = None
    contacts: list[WhatsAppContact] | None = None
    messages: list[WhatsAppMessage] | None = None


class WhatsAppChange(BaseModel):
    value: WhatsAppValue | None = None
    field: str | None = None


class WhatsAppEntry(BaseModel):
    id: str | None = None
    changes: list[WhatsAppChange] | None = None


class WhatsAppWebhookPayload(BaseModel):
    object: str | None = None
    entry: list[WhatsAppEntry] | None = None
