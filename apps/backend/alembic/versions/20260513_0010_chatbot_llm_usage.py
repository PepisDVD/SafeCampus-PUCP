"""Add chatbot LLM token usage tracing

Revision ID: 20260513_0010
Revises: 20260513_0009
Create Date: 2026-05-13
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260513_0010"
down_revision: str | None = "20260513_0009"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "chatbot_llm_usage",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("conversacion_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("incidente_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("correlation_id", sa.String(length=64), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("model", sa.String(length=120), nullable=False),
        sa.Column("prompt_version", sa.String(length=120), nullable=True),
        sa.Column(
            "prompt_tokens",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "completion_tokens",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "total_tokens",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column(
            "fallback_applied",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("fallback_reason", sa.String(length=32), nullable=True),
        sa.Column(
            "raw_response",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["conversacion_id"],
            ["sc_omnicanal.conversacion.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["incidente_id"],
            ["sc_incidentes.incidente.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        schema="sc_omnicanal",
    )
    op.create_index(
        "idx_chatbot_llm_usage_conversation",
        "chatbot_llm_usage",
        ["conversacion_id", "created_at"],
        schema="sc_omnicanal",
    )
    op.create_index(
        "idx_chatbot_llm_usage_correlation",
        "chatbot_llm_usage",
        ["correlation_id"],
        schema="sc_omnicanal",
    )
    op.create_index(
        "idx_chatbot_llm_usage_provider",
        "chatbot_llm_usage",
        ["provider", "created_at"],
        schema="sc_omnicanal",
    )


def downgrade() -> None:
    op.drop_index(
        "idx_chatbot_llm_usage_provider",
        table_name="chatbot_llm_usage",
        schema="sc_omnicanal",
    )
    op.drop_index(
        "idx_chatbot_llm_usage_correlation",
        table_name="chatbot_llm_usage",
        schema="sc_omnicanal",
    )
    op.drop_index(
        "idx_chatbot_llm_usage_conversation",
        table_name="chatbot_llm_usage",
        schema="sc_omnicanal",
    )
    op.drop_table("chatbot_llm_usage", schema="sc_omnicanal")
