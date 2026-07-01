"""Add multiple operator assignments for omnichannel conversations.

Revision ID: 20260627_0034
Revises: 20260627_0033
Create Date: 2026-06-27 00:34:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260627_0034"
down_revision: str | None = "20260627_0033"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "conversacion_operador_asignado",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("conversacion_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("operador_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("asignado_por_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["asignado_por_id"],
            ["sc_users.usuario.id"],
        ),
        sa.ForeignKeyConstraint(
            ["conversacion_id"],
            ["sc_omnicanal.conversacion.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["operador_id"],
            ["sc_users.usuario.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "conversacion_id",
            "operador_id",
            name="uq_conversacion_operador_asignado",
        ),
        schema="sc_omnicanal",
    )
    op.create_index(
        "idx_conversacion_operador_asignado_conv",
        "conversacion_operador_asignado",
        ["conversacion_id"],
        schema="sc_omnicanal",
    )
    op.create_index(
        "idx_conversacion_operador_asignado_operador",
        "conversacion_operador_asignado",
        ["operador_id"],
        schema="sc_omnicanal",
    )
    op.execute(
        """
        INSERT INTO sc_omnicanal.conversacion_operador_asignado
            (conversacion_id, operador_id, asignado_por_id, created_at)
        SELECT id, operador_asignado_id, tomado_por_id, COALESCE(tomado_at, updated_at, now())
        FROM sc_omnicanal.conversacion
        WHERE operador_asignado_id IS NOT NULL
          AND estado <> 'CERRADA'
        ON CONFLICT (conversacion_id, operador_id) DO NOTHING
        """
    )


def downgrade() -> None:
    op.drop_index(
        "idx_conversacion_operador_asignado_operador",
        table_name="conversacion_operador_asignado",
        schema="sc_omnicanal",
    )
    op.drop_index(
        "idx_conversacion_operador_asignado_conv",
        table_name="conversacion_operador_asignado",
        schema="sc_omnicanal",
    )
    op.drop_table("conversacion_operador_asignado", schema="sc_omnicanal")
