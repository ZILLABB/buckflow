"""
Notification Service — Sends WhatsApp template messages for reminders, confirmations, and updates.
Handles appointment reminders, order confirmations, and scheduled notifications.
"""
import uuid
from datetime import datetime, timezone

import structlog
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment, AppointmentStatus
from app.models.business import Business
from app.models.customer import Customer
from app.models.order import Order
from app.models.whatsapp_template import WhatsAppTemplate, TemplateCategory
from app.whatsapp.client import WhatsAppClient

logger = structlog.get_logger()


class NotificationService:
    """Sends templated WhatsApp notifications."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Appointment Notifications ──────────────────────────────

    async def send_appointment_confirmation(
        self, appointment: Appointment
    ) -> bool:
        """Send appointment booking confirmation."""
        customer = await self.db.scalar(
            select(Customer).where(Customer.id == appointment.customer_id)
        )
        business = await self.db.scalar(
            select(Business).where(Business.id == appointment.business_id)
        )
        if not customer or not business:
            return False

        # Try template first, fall back to plain text
        template = await self._get_template(
            business.id, TemplateCategory.APPOINTMENT_CONFIRMATION
        )

        wa_client = WhatsAppClient(
            phone_number_id=business.whatsapp_phone_number_id,
            api_token=business.whatsapp_api_token,
        )

        if template and template.is_approved:
            components = self._build_components(template, {
                "customer_name": customer.name or "Customer",
                "service_name": appointment.service_name,
                "appointment_date": appointment.scheduled_at.strftime("%B %d, %Y"),
                "appointment_time": appointment.scheduled_at.strftime("%I:%M %p"),
                "appointment_ref": appointment.appointment_ref,
                "business_name": business.name,
            })
            result = await wa_client.send_template(
                to=customer.phone,
                template_name=template.name,
                language_code=template.language_code,
                components=components,
            )
        else:
            # Fallback: interactive buttons
            body = (
                f"✅ *Appointment Confirmed*\n\n"
                f"Hi {customer.name or 'there'}! Your appointment has been confirmed.\n\n"
                f"📋 *Service:* {appointment.service_name}\n"
                f"📅 *Date:* {appointment.scheduled_at.strftime('%B %d, %Y')}\n"
                f"🕐 *Time:* {appointment.scheduled_at.strftime('%I:%M %p')}\n"
                f"🔖 *Ref:* {appointment.appointment_ref}\n\n"
                f"Reply 'CANCEL' to cancel or 'RESCHEDULE' to change the time."
            )
            result = await wa_client.send_interactive_buttons(
                to=customer.phone,
                body_text=body,
                buttons=[
                    {"id": "confirm_apt", "title": "Got it ✓"},
                    {"id": "cancel_apt", "title": "Cancel"},
                    {"id": "reschedule_apt", "title": "Reschedule"},
                ],
            )

        return result is not None

    async def send_appointment_reminder(
        self, appointment: Appointment, hours_before: int = 24
    ) -> bool:
        """Send appointment reminder (24h or 2h before)."""
        customer = await self.db.scalar(
            select(Customer).where(Customer.id == appointment.customer_id)
        )
        business = await self.db.scalar(
            select(Business).where(Business.id == appointment.business_id)
        )
        if not customer or not business:
            return False

        template = await self._get_template(
            business.id, TemplateCategory.APPOINTMENT_REMINDER
        )

        wa_client = WhatsAppClient(
            phone_number_id=business.whatsapp_phone_number_id,
            api_token=business.whatsapp_api_token,
        )

        time_label = f"{hours_before} hours" if hours_before > 1 else "1 hour"

        if template and template.is_approved:
            components = self._build_components(template, {
                "customer_name": customer.name or "Customer",
                "service_name": appointment.service_name,
                "appointment_date": appointment.scheduled_at.strftime("%B %d, %Y"),
                "appointment_time": appointment.scheduled_at.strftime("%I:%M %p"),
                "time_until": time_label,
                "business_name": business.name,
            })
            result = await wa_client.send_template(
                to=customer.phone,
                template_name=template.name,
                language_code=template.language_code,
                components=components,
            )
        else:
            body = (
                f"⏰ *Appointment Reminder*\n\n"
                f"Hi {customer.name or 'there'}! Just a reminder that your "
                f"appointment is in *{time_label}*.\n\n"
                f"📋 *Service:* {appointment.service_name}\n"
                f"📅 *Date:* {appointment.scheduled_at.strftime('%B %d, %Y')}\n"
                f"🕐 *Time:* {appointment.scheduled_at.strftime('%I:%M %p')}\n"
                f"📍 *At:* {business.name}\n\n"
                f"See you soon! 🙂"
            )
            result = await wa_client.send_text(to=customer.phone, text=body)

        if result:
            # Mark reminder as sent
            if hours_before >= 24:
                appointment.reminder_24h_sent = True
            else:
                appointment.reminder_2h_sent = True
            await self.db.flush()

        return result is not None

    async def send_appointment_followup(self, appointment: Appointment) -> bool:
        """Send post-appointment follow-up message."""
        customer = await self.db.scalar(
            select(Customer).where(Customer.id == appointment.customer_id)
        )
        business = await self.db.scalar(
            select(Business).where(Business.id == appointment.business_id)
        )
        if not customer or not business:
            return False

        wa_client = WhatsAppClient(
            phone_number_id=business.whatsapp_phone_number_id,
            api_token=business.whatsapp_api_token,
        )

        body = (
            f"Thank you for visiting *{business.name}*! 🙏\n\n"
            f"We hope you enjoyed your {appointment.service_name}. "
            f"We'd love to hear your feedback!\n\n"
            f"Would you like to book another appointment?"
        )
        result = await wa_client.send_interactive_buttons(
            to=customer.phone,
            body_text=body,
            buttons=[
                {"id": "rate_5star", "title": "⭐ Rate 5 Stars"},
                {"id": "book_again", "title": "📅 Book Again"},
                {"id": "feedback", "title": "💬 Feedback"},
            ],
        )

        if result:
            appointment.followup_sent = True
            await self.db.flush()

        return result is not None

    # ── Order Notifications ────────────────────────────────────

    async def send_order_confirmation(
        self, order: Order, customer: Customer, business: Business
    ) -> bool:
        """Send order confirmation message."""
        template = await self._get_template(
            business.id, TemplateCategory.ORDER_CONFIRMATION
        )

        wa_client = WhatsAppClient(
            phone_number_id=business.whatsapp_phone_number_id,
            api_token=business.whatsapp_api_token,
        )

        if template and template.is_approved:
            components = self._build_components(template, {
                "customer_name": customer.name or "Customer",
                "order_ref": order.order_ref,
                "total_amount": f"₦{order.total_amount:,.0f}",
                "business_name": business.name,
            })
            result = await wa_client.send_template(
                to=customer.phone,
                template_name=template.name,
                language_code=template.language_code,
                components=components,
            )
        else:
            body = (
                f"🛒 *Order Confirmed!*\n\n"
                f"Hi {customer.name or 'there'}! Your order has been received.\n\n"
                f"🔖 *Order Ref:* {order.order_ref}\n"
                f"💰 *Total:* ₦{order.total_amount:,.0f}\n\n"
                f"We'll update you on delivery progress.\n"
                f"Thank you for shopping with {business.name}! 🙏"
            )
            result = await wa_client.send_text(to=customer.phone, text=body)

        return result is not None

    async def send_order_status_update(
        self, order: Order, customer: Customer, business: Business, new_status: str
    ) -> bool:
        """Send order status update."""
        wa_client = WhatsAppClient(
            phone_number_id=business.whatsapp_phone_number_id,
            api_token=business.whatsapp_api_token,
        )

        status_emoji = {
            "processing": "⚙️",
            "shipped": "🚚",
            "delivered": "✅",
            "cancelled": "❌",
        }
        emoji = status_emoji.get(new_status, "📦")

        body = (
            f"{emoji} *Order Update*\n\n"
            f"Hi {customer.name or 'there'}! Your order *{order.order_ref}* "
            f"status has been updated to: *{new_status.upper()}*\n\n"
        )

        if new_status == "shipped":
            body += "Your order is on its way! 🎉"
        elif new_status == "delivered":
            body += "Your order has been delivered. Enjoy! 🙂"

        result = await wa_client.send_text(to=customer.phone, text=body)
        return result is not None

    # ── Welcome Message ────────────────────────────────────────

    async def send_welcome_message(
        self, customer: Customer, business: Business
    ) -> bool:
        """Send welcome message to new customers."""
        template = await self._get_template(business.id, TemplateCategory.WELCOME)

        wa_client = WhatsAppClient(
            phone_number_id=business.whatsapp_phone_number_id,
            api_token=business.whatsapp_api_token,
        )

        if template and template.is_approved:
            components = self._build_components(template, {
                "customer_name": customer.name or "there",
                "business_name": business.name,
            })
            result = await wa_client.send_template(
                to=customer.phone,
                template_name=template.name,
                language_code=template.language_code,
                components=components,
            )
        else:
            body = (
                f"👋 Welcome to *{business.name}*!\n\n"
                f"Hi {customer.name or 'there'}! We're here to help.\n\n"
                f"You can ask me about:\n"
                f"• Our products and prices\n"
                f"• Delivery information\n"
                f"• Place an order\n"
                f"• Book an appointment\n\n"
                f"How can I help you today?"
            )
            result = await wa_client.send_text(to=customer.phone, text=body)

        return result is not None

    # ── Private Helpers ────────────────────────────────────────

    async def _get_template(
        self, business_id: uuid.UUID, category: TemplateCategory
    ) -> WhatsAppTemplate | None:
        """Get active template for a business and category."""
        result = await self.db.execute(
            select(WhatsAppTemplate).where(
                WhatsAppTemplate.business_id == business_id,
                WhatsAppTemplate.category == category,
                WhatsAppTemplate.is_active == True,
            ).limit(1)
        )
        return result.scalar_one_or_none()

    def _build_components(
        self, template: WhatsAppTemplate, variables: dict
    ) -> list[dict]:
        """Build WhatsApp template components from parameter map and variables."""
        if not template.parameter_map:
            return []

        parameters = []
        for idx in sorted(template.parameter_map.keys()):
            var_name = template.parameter_map[idx]
            value = variables.get(var_name, "")
            parameters.append({"type": "text", "text": str(value)})

        if not parameters:
            return []

        return [{"type": "body", "parameters": parameters}]
