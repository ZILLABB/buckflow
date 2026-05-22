"""MVP features: customer control, appointments, conversions, templates, billing

Revision ID: 001_mvp
Revises: None
Create Date: 2026-05-21

Adds:
- Customer control fields (status, ai_enabled, is_flagged, tags, block_reason)
- Business type, category, operating_hours, booking settings, human_only_mode
- Conversation archive, lock, assign fields
- Appointments + ServiceItem tables
- ConversionEvent table
- ModeChangeLog table
- WhatsAppTemplate table
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
    # ── Customer control fields ──
    op.add_column("customers", sa.Column("status", sa.String(20), server_default="active"))
    op.add_column("customers", sa.Column("ai_enabled", sa.Boolean(), server_default="true"))
    op.add_column("customers", sa.Column("is_flagged", sa.Boolean(), server_default="false"))
    op.add_column("customers", sa.Column("tags", ARRAY(sa.String(50)), nullable=True))
    op.add_column("customers", sa.Column("block_reason", sa.String(255), nullable=True))

    # ── Business type & hours fields ──
    op.add_column("businesses", sa.Column("business_type", sa.String(20), server_default="product"))
    op.add_column("businesses", sa.Column("category", sa.String(20), server_default="other"))
    op.add_column("businesses", sa.Column("operating_hours", JSON, nullable=True))
    op.add_column("businesses", sa.Column("timezone", sa.String(50), server_default="Africa/Lagos"))
    op.add_column("businesses", sa.Column("auto_reply_outside_hours", sa.Boolean(), server_default="true"))
    op.add_column("businesses", sa.Column("outside_hours_message", sa.Text(), nullable=True))
    op.add_column("businesses", sa.Column("booking_enabled", sa.Boolean(), server_default="false"))
    op.add_column("businesses", sa.Column("booking_lead_time_hours", sa.Integer(), server_default="24"))
    op.add_column("businesses", sa.Column("booking_slot_duration_mins", sa.Integer(), server_default="60"))
    op.add_column("businesses", sa.Column("human_only_mode", sa.Boolean(), server_default="false"))

    # ── Conversation archive/lock/assign ──
    op.add_column("conversations", sa.Column("is_archived", sa.Boolean(), server_default="false"))
    op.add_column("conversations", sa.Column("is_locked", sa.Boolean(), server_default="false"))
    op.add_column("conversations", sa.Column("locked_by", sa.String(150), nullable=True))
    op.add_column("conversations", sa.Column(
        "assigned_to", UUID(as_uuid=True),
        sa.ForeignKey("users.id"), nullable=True
    ))

    # ── Appointments table ──
    op.create_table(
        "appointments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("business_id", UUID(as_uuid=True), sa.ForeignKey("businesses.id"), nullable=False, index=True),
        sa.Column("customer_id", UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("conversation_id", UUID(as_uuid=True), sa.ForeignKey("conversations.id"), nullable=True),
        sa.Column("appointment_ref", sa.String(20), unique=True, nullable=False),
        sa.Column("service_name", sa.String(200), nullable=False),
        sa.Column("status", sa.String(20), server_default="requested"),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_mins", sa.Integer(), server_default="60"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("reminder_24h_sent", sa.Boolean(), server_default="false"),
        sa.Column("reminder_2h_sent", sa.Boolean(), server_default="false"),
        sa.Column("followup_sent", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Service items table ──
    op.create_table(
        "service_items",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("business_id", UUID(as_uuid=True), sa.ForeignKey("businesses.id"), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price", sa.Integer(), server_default="0"),
        sa.Column("duration_mins", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Conversion events table ──
    op.create_table(
        "conversion_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("business_id", UUID(as_uuid=True), sa.ForeignKey("businesses.id"), nullable=False, index=True),
        sa.Column("conversation_id", UUID(as_uuid=True), sa.ForeignKey("conversations.id"), nullable=True),
        sa.Column("customer_id", UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=True),
        sa.Column("conversion_type", sa.String(20), nullable=False),
        sa.Column("order_id", UUID(as_uuid=True), nullable=True),
        sa.Column("appointment_id", UUID(as_uuid=True), nullable=True),
        sa.Column("revenue_amount", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Mode change log table ──
    op.create_table(
        "mode_change_logs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("conversation_id", UUID(as_uuid=True), sa.ForeignKey("conversations.id"), nullable=False),
        sa.Column("changed_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("from_mode", sa.String(20), nullable=False),
        sa.Column("to_mode", sa.String(20), nullable=False),
        sa.Column("reason", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── WhatsApp templates table ──
    op.create_table(
        "whatsapp_templates",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("business_id", UUID(as_uuid=True), sa.ForeignKey("businesses.id"), nullable=False, index=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("category", sa.String(30), nullable=False),
        sa.Column("language_code", sa.String(10), server_default="en"),
        sa.Column("body_text", sa.Text(), nullable=False),
        sa.Column("header_text", sa.String(255), nullable=True),
        sa.Column("footer_text", sa.String(100), nullable=True),
        sa.Column("parameter_map", JSON, nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("is_approved", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("whatsapp_templates")
    op.drop_table("mode_change_logs")
    op.drop_table("conversion_events")
    op.drop_table("service_items")
    op.drop_table("appointments")

    op.drop_column("conversations", "assigned_to")
    op.drop_column("conversations", "locked_by")
    op.drop_column("conversations", "is_locked")
    op.drop_column("conversations", "is_archived")

    op.drop_column("businesses", "human_only_mode")
    op.drop_column("businesses", "booking_slot_duration_mins")
    op.drop_column("businesses", "booking_lead_time_hours")
    op.drop_column("businesses", "booking_enabled")
    op.drop_column("businesses", "outside_hours_message")
    op.drop_column("businesses", "auto_reply_outside_hours")
    op.drop_column("businesses", "timezone")
    op.drop_column("businesses", "operating_hours")
    op.drop_column("businesses", "category")
    op.drop_column("businesses", "business_type")

    op.drop_column("customers", "block_reason")
    op.drop_column("customers", "tags")
    op.drop_column("customers", "is_flagged")
    op.drop_column("customers", "ai_enabled")
    op.drop_column("customers", "status")
