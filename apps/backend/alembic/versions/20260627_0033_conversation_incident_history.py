"""Add conversation incident history.

Revision ID: 20260627_0033
Revises: 20260627_0032
Create Date: 2026-06-27
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260627_0033"
down_revision: str | None = "20260627_0032"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.drop_constraint(
        "ck_conversacion_cerrada_sin_ciclo",
        "conversacion",
        schema="sc_omnicanal",
        type_="check",
    )

    op.create_table(
        "conversacion_incidente_historial",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("conversacion_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("incidente_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("actor_usuario_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("actor_tipo", sa.String(length=16), nullable=False, server_default="SISTEMA"),
        sa.Column("tipo_asociacion", sa.String(length=32), nullable=False),
        sa.Column(
            "asociado_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("finalizado_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("motivo_finalizacion", sa.String(length=64), nullable=True),
        sa.Column(
            "metadatos",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            server_default=sa.text("'{}'::jsonb"),
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
        sa.ForeignKeyConstraint(["actor_usuario_id"], ["sc_users.usuario.id"]),
        schema="sc_omnicanal",
    )
    op.create_index(
        "idx_conversacion_incidente_historial_conv",
        "conversacion_incidente_historial",
        ["conversacion_id", "asociado_at"],
        schema="sc_omnicanal",
    )
    op.create_index(
        "idx_conversacion_incidente_historial_incidente",
        "conversacion_incidente_historial",
        ["incidente_id"],
        schema="sc_omnicanal",
    )
    op.create_index(
        "uq_conversacion_incidente_historial_activa",
        "conversacion_incidente_historial",
        ["conversacion_id"],
        unique=True,
        schema="sc_omnicanal",
        postgresql_where=sa.text("finalizado_at IS NULL"),
    )

    op.execute(
        """
        INSERT INTO sc_omnicanal.conversacion_incidente_historial (
            conversacion_id,
            incidente_id,
            actor_tipo,
            tipo_asociacion,
            asociado_at,
            finalizado_at,
            motivo_finalizacion,
            metadatos
        )
        SELECT
            id,
            incidente_id,
            'SISTEMA',
            'LEGACY_ACTIVA',
            COALESCE(created_at, now()),
            CASE
                WHEN estado = 'CERRADA' THEN COALESCE(cerrado_at, updated_at, now())
                ELSE NULL
            END,
            CASE
                WHEN estado = 'CERRADA' THEN 'CONVERSACION_CERRADA'
                ELSE NULL
            END,
            jsonb_build_object('migrated_from', 'conversacion.incidente_id')
        FROM sc_omnicanal.conversacion
        WHERE incidente_id IS NOT NULL
        """
    )

    op.execute(
        """
        UPDATE sc_omnicanal.conversacion
        SET modo_atencion = NULL,
            prioridad = NULL,
            operador_asignado_id = NULL,
            tomado_por_id = NULL,
            tomado_at = NULL,
            incidente_id = NULL,
            updated_at = now()
        WHERE estado = 'CERRADA'
          AND (
            modo_atencion IS NOT NULL
            OR prioridad IS NOT NULL
            OR operador_asignado_id IS NOT NULL
            OR tomado_por_id IS NOT NULL
            OR tomado_at IS NOT NULL
            OR incidente_id IS NOT NULL
          )
        """
    )

    op.create_check_constraint(
        "ck_conversacion_cerrada_sin_ciclo",
        "conversacion",
        "estado <> 'CERRADA' OR (modo_atencion IS NULL AND prioridad IS NULL "
        "AND operador_asignado_id IS NULL AND tomado_por_id IS NULL "
        "AND tomado_at IS NULL AND incidente_id IS NULL)",
        schema="sc_omnicanal",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_conversacion_cerrada_sin_ciclo",
        "conversacion",
        schema="sc_omnicanal",
        type_="check",
    )
    op.drop_index(
        "uq_conversacion_incidente_historial_activa",
        table_name="conversacion_incidente_historial",
        schema="sc_omnicanal",
    )
    op.drop_index(
        "idx_conversacion_incidente_historial_incidente",
        table_name="conversacion_incidente_historial",
        schema="sc_omnicanal",
    )
    op.drop_index(
        "idx_conversacion_incidente_historial_conv",
        table_name="conversacion_incidente_historial",
        schema="sc_omnicanal",
    )
    op.drop_table("conversacion_incidente_historial", schema="sc_omnicanal")
    op.create_check_constraint(
        "ck_conversacion_cerrada_sin_ciclo",
        "conversacion",
        "estado <> 'CERRADA' OR (modo_atencion IS NULL AND prioridad IS NULL "
        "AND operador_asignado_id IS NULL AND tomado_por_id IS NULL AND tomado_at IS NULL)",
        schema="sc_omnicanal",
    )
