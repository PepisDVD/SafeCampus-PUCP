"""Add chatbot state storage for omnichannel conversations.

Revision ID: 20260513_0008
Revises: 20260513_0007
Create Date: 2026-05-13
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260513_0008"
down_revision: str | None = "20260513_0007"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "chatbot_estado_conversacion",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("conversacion_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("bot_status", sa.String(length=32), nullable=False, server_default="BOT_NEW"),
        sa.Column("last_intent", sa.String(length=32), nullable=True),
        sa.Column("last_action", sa.String(length=32), nullable=True),
        sa.Column(
            "requires_human_review",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("handoff_reason", sa.Text(), nullable=True),
        sa.Column("ai_summary", sa.Text(), nullable=True),
        sa.Column(
            "memory_snapshot",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "incident_draft",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "missing_fields",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("classification_category", sa.String(length=100), nullable=True),
        sa.Column("classification_severity", sa.String(length=16), nullable=True),
        sa.Column("classification_confidence", postgresql.DOUBLE_PRECISION(), nullable=True),
        sa.Column("suggested_reply", sa.Text(), nullable=True),
        sa.Column("last_bot_reply", sa.Text(), nullable=True),
        sa.Column("last_user_message_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_bot_message_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "bot_status IN ('BOT_NEW', 'BOT_COLLECTING', 'BOT_INCIDENT_DRAFTED', 'BOT_ESCALATED', 'HUMAN_ACTIVE', 'BOT_PAUSED')",
            name="ck_chatbot_estado_bot_status",
        ),
        sa.ForeignKeyConstraint(
            ["conversacion_id"],
            ["sc_omnicanal.conversacion.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("conversacion_id", name="uq_chatbot_estado_conversacion"),
        schema="sc_omnicanal",
    )
    op.create_index(
        "idx_chatbot_estado_bot_status",
        "chatbot_estado_conversacion",
        ["bot_status"],
        schema="sc_omnicanal",
    )
    op.create_index(
        "idx_chatbot_estado_requires_review",
        "chatbot_estado_conversacion",
        ["requires_human_review"],
        schema="sc_omnicanal",
    )


def downgrade() -> None:
    op.drop_index(
        "idx_chatbot_estado_requires_review",
        table_name="chatbot_estado_conversacion",
        schema="sc_omnicanal",
    )
    op.drop_index(
        "idx_chatbot_estado_bot_status",
        table_name="chatbot_estado_conversacion",
        schema="sc_omnicanal",
    )
    op.drop_table("chatbot_estado_conversacion", schema="sc_omnicanal")