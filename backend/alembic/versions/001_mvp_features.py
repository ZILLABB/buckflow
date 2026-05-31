"""Full initial schema: all BuckFlow AI tables

Revision ID: 001_mvp
Revises: None
Create Date: 2026-05-21

Creates all 15 base tables from SQLAlchemy models:
- businesses, users, customers, conversations, messages
- orders, order_items, order_status_logs
- plans, subscriptions, ai_requests, rule_responses, usage_logs
- appointments, service_items
- conversion_events, mode_change_logs, whatsapp_templates
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID, JSON, ARRAY

# revision identifiers
revision: str = "001_mvp"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Businesses (must be first — users FK to it) ──
    op.create_table(
        "businesses",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False, unique=True, index=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        # Business type & category
        sa.Column("business_type", sa.String(20), server_default="product", nullable=False),
        sa.Column("category", sa.String(20), server_default="other", nullable=False),
        # Operating hours
        sa.Column("operating_hours", JSON, nullable=True),
        sa.Column("timezone", sa.String(50), server_default="Africa/Lagos", nullable=False),
        sa.Column("auto_reply_outside_hours", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("outside_hours_message", sa.Text(), nullable=True),
        # Booking settings
        sa.Column("booking_enabled", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("booking_lead_time_hours", sa.Integer(), server_default="24", nullable=False),
        sa.Column("booking_slot_duration_mins", sa.Integer(), server_default="60", nullable=False),
        # WhatsApp
        sa.Column("whatsapp_phone_number_id", sa.String(50), nullable=True),
        sa.Column("whatsapp_api_token", sa.String(500), nullable=True),
        sa.Column("whatsapp_verified", sa.Boolean(), server_default="false", nullable=False),
        # AI settings
        sa.Column("ai_system_prompt", sa.Text(), nullable=True),
        sa.Column("ai_model", sa.String(30), server_default="gpt-4o-mini", nullable=False),
        sa.Column("ai_enabled", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("human_only_mode", sa.Boolean(), server_default="false", nullable=False),
        # Limits
        sa.Column("monthly_ai_limit", sa.Integer(), server_default="500", nullable=False),
        sa.Column("monthly_conversation_limit", sa.Integer(), server_default="1000", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        # Timestamps
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Users ──
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True, index=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("full_name", sa.String(150), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("role", sa.String(20), server_default="owner", nullable=False),
        sa.Column("business_id", UUID(as_uuid=True), sa.ForeignKey("businesses.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Customers ──
    op.create_table(
        "customers",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("business_id", UUID(as_uuid=True), sa.ForeignKey("businesses.id"), nullable=False, index=True),
        sa.Column("wa_id", sa.String(50), nullable=False, index=True),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("name", sa.String(150), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        # Customer control fields
        sa.Column("status", sa.String(20), server_default="active", nullable=False),
        sa.Column("ai_enabled", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("is_flagged", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("tags", ARRAY(sa.String(50)), nullable=True),
        sa.Column("block_reason", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Conversations ──
    op.create_table(
        "conversations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("business_id", UUID(as_uuid=True), sa.ForeignKey("businesses.id"), nullable=False, index=True),
        sa.Column("customer_id", UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=False, index=True),
        sa.Column("wa_conversation_id", sa.String(100), nullable=True),
        sa.Column("mode", sa.String(10), server_default="ai", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("is_archived", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("is_locked", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("locked_by", sa.String(150), nullable=True),
        sa.Column("assigned_to", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Messages ──
    op.create_table(
        "messages",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("conversation_id", UUID(as_uuid=True), sa.ForeignKey("conversations.id"), nullable=False, index=True),
        sa.Column("wa_message_id", sa.String(100), nullable=True, unique=True),
        sa.Column("direction", sa.String(10), nullable=False),
        sa.Column("msg_type", sa.String(20), server_default="text", nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("media_url", sa.String(500), nullable=True),
        sa.Column("response_source", sa.String(20), nullable=True),
        sa.Column("tokens_used", sa.Integer(), server_default="0", nullable=False),
        sa.Column("cost_naira", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Orders ──
    op.create_table(
        "orders",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("business_id", UUID(as_uuid=True), sa.ForeignKey("businesses.id"), nullable=False, index=True),
        sa.Column("customer_id", UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=False, index=True),
        sa.Column("conversation_id", UUID(as_uuid=True), sa.ForeignKey("conversations.id"), nullable=True),
        sa.Column("order_ref", sa.String(20), nullable=False, unique=True, index=True),
        sa.Column("status", sa.String(30), server_default="created", nullable=False),
        sa.Column("total_amount", sa.Integer(), server_default="0", nullable=False),
        sa.Column("currency", sa.String(3), server_default="NGN", nullable=False),
        sa.Column("delivery_address", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Order Items ──
    op.create_table(
        "order_items",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", UUID(as_uuid=True), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("product_name", sa.String(255), nullable=False),
        sa.Column("quantity", sa.Integer(), server_default="1", nullable=False),
        sa.Column("unit_price", sa.Integer(), nullable=False),
        sa.Column("total_price", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Order Status Logs ──
    op.create_table(
        "order_status_logs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", UUID(as_uuid=True), sa.ForeignKey("orders.id"), nullable=False, index=True),
        sa.Column("from_status", sa.String(30), nullable=True),
        sa.Column("to_status", sa.String(30), nullable=False),
        sa.Column("changed_by", sa.String(50), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Plans ──
    op.create_table(
        "plans",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("tier", sa.String(20), nullable=False, unique=True),
        sa.Column("price_naira", sa.Integer(), nullable=False),
        sa.Column("conversation_limit", sa.Integer(), nullable=False),
        sa.Column("ai_messages_limit", sa.Integer(), nullable=False),
        sa.Column("ai_model", sa.String(30), server_default="gpt-4o-mini", nullable=False),
        sa.Column("rag_enabled", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Subscriptions ──
    op.create_table(
        "subscriptions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("business_id", UUID(as_uuid=True), sa.ForeignKey("businesses.id"), nullable=False, index=True),
        sa.Column("plan_id", UUID(as_uuid=True), sa.ForeignKey("plans.id"), nullable=False),
        sa.Column("status", sa.String(20), server_default="trial", nullable=False),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("paystack_subscription_code", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── AI Requests ──
    op.create_table(
        "ai_requests",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("business_id", UUID(as_uuid=True), sa.ForeignKey("businesses.id"), nullable=False, index=True),
        sa.Column("conversation_id", UUID(as_uuid=True), sa.ForeignKey("conversations.id"), nullable=True),
        sa.Column("model", sa.String(30), nullable=False),
        sa.Column("prompt_tokens", sa.Integer(), server_default="0", nullable=False),
        sa.Column("completion_tokens", sa.Integer(), server_default="0", nullable=False),
        sa.Column("total_tokens", sa.Integer(), server_default="0", nullable=False),
        sa.Column("cost_usd_cents", sa.Integer(), server_default="0", nullable=False),
        sa.Column("prompt_preview", sa.Text(), nullable=True),
        sa.Column("response_preview", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Rule Responses ──
    op.create_table(
        "rule_responses",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("business_id", UUID(as_uuid=True), sa.ForeignKey("businesses.id"), nullable=False, index=True),
        sa.Column("category", sa.String(50), nullable=False, index=True),
        sa.Column("keywords", ARRAY(sa.String()), nullable=False),
        sa.Column("response_text", sa.Text(), nullable=False),
        sa.Column("priority", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Usage Logs ──
    op.create_table(
        "usage_logs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("business_id", UUID(as_uuid=True), sa.ForeignKey("businesses.id"), nullable=False, index=True),
        sa.Column("log_date", sa.Date(), nullable=False, index=True),
        sa.Column("total_messages", sa.Integer(), server_default="0", nullable=False),
        sa.Column("rule_responses", sa.Integer(), server_default="0", nullable=False),
        sa.Column("ai_mini_responses", sa.Integer(), server_default="0", nullable=False),
        sa.Column("ai_premium_responses", sa.Integer(), server_default="0", nullable=False),
        sa.Column("cache_hits", sa.Integer(), server_default="0", nullable=False),
        sa.Column("human_responses", sa.Integer(), server_default="0", nullable=False),
        sa.Column("total_tokens", sa.Integer(), server_default="0", nullable=False),
        sa.Column("total_cost_usd_cents", sa.Integer(), server_default="0", nullable=False),
        sa.Column("conversations_started", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("business_id", "log_date", name="uq_usage_business_date"),
    )

    # ── Appointments ──
    op.create_table(
        "appointments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("business_id", UUID(as_uuid=True), sa.ForeignKey("businesses.id"), nullable=False, index=True),
        sa.Column("customer_id", UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=False, index=True),
        sa.Column("conversation_id", UUID(as_uuid=True), sa.ForeignKey("conversations.id"), nullable=True),
        sa.Column("service_name", sa.String(255), nullable=False),
        sa.Column("appointment_ref", sa.String(20), nullable=False, unique=True, index=True),
        sa.Column("status", sa.String(20), server_default="requested", nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_mins", sa.Integer(), server_default="60", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("reminder_24h_sent", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("reminder_2h_sent", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("followup_sent", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Service Items ──
    op.create_table(
        "service_items",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("business_id", UUID(as_uuid=True), sa.ForeignKey("businesses.id"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price", sa.Integer(), server_default="0", nullable=False),
        sa.Column("currency", sa.String(3), server_default="NGN", nullable=False),
        sa.Column("duration_mins", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Conversion Events ──
    op.create_table(
        "conversion_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("business_id", UUID(as_uuid=True), sa.ForeignKey("businesses.id"), nullable=False, index=True),
        sa.Column("conversation_id", UUID(as_uuid=True), sa.ForeignKey("conversations.id"), nullable=False, index=True),
        sa.Column("customer_id", UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=False, index=True),
        sa.Column("conversion_type", sa.String(20), nullable=False),
        sa.Column("order_id", UUID(as_uuid=True), sa.ForeignKey("orders.id"), nullable=True),
        sa.Column("appointment_id", UUID(as_uuid=True), sa.ForeignKey("appointments.id"), nullable=True),
        sa.Column("revenue_amount", sa.Integer(), server_default="0", nullable=False),
        sa.Column("currency", sa.String(3), server_default="NGN", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Mode Change Logs ──
    op.create_table(
        "mode_change_logs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("conversation_id", UUID(as_uuid=True), sa.ForeignKey("conversations.id"), nullable=False, index=True),
        sa.Column("changed_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("from_mode", sa.String(20), nullable=False),
        sa.Column("to_mode", sa.String(20), nullable=False),
        sa.Column("reason", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── WhatsApp Templates ──
    op.create_table(
        "whatsapp_templates",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("business_id", UUID(as_uuid=True), sa.ForeignKey("businesses.id"), nullable=False, index=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("category", sa.String(30), nullable=False),
        sa.Column("language_code", sa.String(10), server_default="en", nullable=False),
        sa.Column("body_text", sa.Text(), nullable=False),
        sa.Column("header_text", sa.String(255), nullable=True),
        sa.Column("footer_text", sa.String(100), nullable=True),
        sa.Column("parameter_map", JSON, nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("is_approved", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("whatsapp_templates")
    op.drop_table("mode_change_logs")
    op.drop_table("conversion_events")
    op.drop_table("service_items")
    op.drop_table("appointments")
    op.drop_table("usage_logs")
    op.drop_table("rule_responses")
    op.drop_table("ai_requests")
    op.drop_table("subscriptions")
    op.drop_table("plans")
    op.drop_table("order_status_logs")
    op.drop_table("order_items")
    op.drop_table("orders")
    op.drop_table("messages")
    op.drop_table("conversations")
    op.drop_table("customers")
    op.drop_table("users")
    op.drop_table("businesses")
