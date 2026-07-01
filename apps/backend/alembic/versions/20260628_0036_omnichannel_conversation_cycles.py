"""Add omnichannel conversation cycles.

Revision ID: 20260628_0036
Revises: 20260627_0035
Create Date: 2026-06-28
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260628_0036"
down_revision: str | None = "20260627_0035"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "conversacion_ciclo",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("conversacion_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("incidente_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("estado", sa.String(length=16), nullable=False, server_default="ACTIVO"),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cerrado_por_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("cierre_motivo", sa.Text(), nullable=True),
        sa.Column("cierre_tipo", sa.String(length=32), nullable=False, server_default="MANUAL"),
        sa.Column(
            "mensajes_snapshot",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "eventos_snapshot",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "chatbot_snapshot",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "asignaciones_snapshot",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "clasificacion_snapshot",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "metadatos",
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
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["conversacion_id"], ["sc_omnicanal.conversacion.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["incidente_id"], ["sc_incidentes.incidente.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(["cerrado_por_id"], ["sc_users.usuario.id"]),
        schema="sc_omnicanal",
    )
    op.create_index(
        "idx_conversacion_ciclo_conversacion",
        "conversacion_ciclo",
        ["conversacion_id", "started_at"],
        schema="sc_omnicanal",
    )
    op.create_index(
        "idx_conversacion_ciclo_incidente",
        "conversacion_ciclo",
        ["incidente_id"],
        schema="sc_omnicanal",
    )
    op.create_index(
        "idx_conversacion_ciclo_estado",
        "conversacion_ciclo",
        ["estado"],
        schema="sc_omnicanal",
    )
    op.create_index(
        "uq_conversacion_ciclo_activo",
        "conversacion_ciclo",
        ["conversacion_id"],
        unique=True,
        schema="sc_omnicanal",
        postgresql_where=sa.text("estado = 'ACTIVO'"),
    )

    op.add_column(
        "mensaje_conversacion",
        sa.Column("ciclo_id", postgresql.UUID(as_uuid=True), nullable=True),
        schema="sc_omnicanal",
    )
    op.add_column(
        "evento_conversacion",
        sa.Column("ciclo_id", postgresql.UUID(as_uuid=True), nullable=True),
        schema="sc_omnicanal",
    )
    op.add_column(
        "chatbot_llm_usage",
        sa.Column("ciclo_id", postgresql.UUID(as_uuid=True), nullable=True),
        schema="sc_omnicanal",
    )
    op.create_foreign_key(
        "fk_mensaje_conversacion_ciclo",
        "mensaje_conversacion",
        "conversacion_ciclo",
        ["ciclo_id"],
        ["id"],
        source_schema="sc_omnicanal",
        referent_schema="sc_omnicanal",
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_evento_conversacion_ciclo",
        "evento_conversacion",
        "conversacion_ciclo",
        ["ciclo_id"],
        ["id"],
        source_schema="sc_omnicanal",
        referent_schema="sc_omnicanal",
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_chatbot_llm_usage_ciclo",
        "chatbot_llm_usage",
        "conversacion_ciclo",
        ["ciclo_id"],
        ["id"],
        source_schema="sc_omnicanal",
        referent_schema="sc_omnicanal",
        ondelete="SET NULL",
    )
    op.create_index(
        "idx_mensaje_conversacion_ciclo",
        "mensaje_conversacion",
        ["ciclo_id", "created_at"],
        schema="sc_omnicanal",
    )
    op.create_index(
        "idx_evento_conversacion_ciclo",
        "evento_conversacion",
        ["ciclo_id", "created_at"],
        schema="sc_omnicanal",
    )
    op.create_index(
        "idx_chatbot_llm_usage_ciclo",
        "chatbot_llm_usage",
        ["ciclo_id", "created_at"],
        schema="sc_omnicanal",
    )

    op.execute(
        """
        INSERT INTO sc_omnicanal.conversacion_ciclo (
            conversacion_id,
            incidente_id,
            estado,
            started_at,
            closed_at,
            cerrado_por_id,
            cierre_motivo,
            cierre_tipo,
            metadatos
        )
        SELECT
            id,
            incidente_id,
            CASE WHEN estado = 'CERRADA' THEN 'CERRADO' ELSE 'ACTIVO' END,
            COALESCE(created_at, now()),
            CASE WHEN estado = 'CERRADA' THEN COALESCE(cerrado_at, updated_at, now()) ELSE NULL END,
            cerrado_por_id,
            motivo_cierre,
            'MIGRACION',
            jsonb_build_object('migrated_from', 'legacy_conversation')
        FROM sc_omnicanal.conversacion
        """
    )
    op.execute(
        """
        UPDATE sc_omnicanal.mensaje_conversacion mensaje
        SET ciclo_id = ciclo.id
        FROM sc_omnicanal.conversacion_ciclo ciclo
        WHERE ciclo.conversacion_id = mensaje.conversacion_id
        """
    )
    op.execute(
        """
        UPDATE sc_omnicanal.evento_conversacion evento
        SET ciclo_id = ciclo.id
        FROM sc_omnicanal.conversacion_ciclo ciclo
        WHERE ciclo.conversacion_id = evento.conversacion_id
        """
    )
    op.execute(
        """
        UPDATE sc_omnicanal.chatbot_llm_usage usage
        SET ciclo_id = ciclo.id
        FROM sc_omnicanal.conversacion_ciclo ciclo
        WHERE ciclo.conversacion_id = usage.conversacion_id
        """
    )


def downgrade() -> None:
    op.drop_index(
        "idx_chatbot_llm_usage_ciclo", table_name="chatbot_llm_usage", schema="sc_omnicanal"
    )
    op.drop_index(
        "idx_evento_conversacion_ciclo", table_name="evento_conversacion", schema="sc_omnicanal"
    )
    op.drop_index(
        "idx_mensaje_conversacion_ciclo", table_name="mensaje_conversacion", schema="sc_omnicanal"
    )
    op.drop_constraint(
        "fk_chatbot_llm_usage_ciclo", "chatbot_llm_usage", schema="sc_omnicanal", type_="foreignkey"
    )
    op.drop_constraint(
        "fk_evento_conversacion_ciclo",
        "evento_conversacion",
        schema="sc_omnicanal",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_mensaje_conversacion_ciclo",
        "mensaje_conversacion",
        schema="sc_omnicanal",
        type_="foreignkey",
    )
    op.drop_column("chatbot_llm_usage", "ciclo_id", schema="sc_omnicanal")
    op.drop_column("evento_conversacion", "ciclo_id", schema="sc_omnicanal")
    op.drop_column("mensaje_conversacion", "ciclo_id", schema="sc_omnicanal")
    op.drop_index(
        "uq_conversacion_ciclo_activo", table_name="conversacion_ciclo", schema="sc_omnicanal"
    )
    op.drop_index(
        "idx_conversacion_ciclo_estado", table_name="conversacion_ciclo", schema="sc_omnicanal"
    )
    op.drop_index(
        "idx_conversacion_ciclo_incidente", table_name="conversacion_ciclo", schema="sc_omnicanal"
    )
    op.drop_index(
        "idx_conversacion_ciclo_conversacion",
        table_name="conversacion_ciclo",
        schema="sc_omnicanal",
    )
    op.drop_table("conversacion_ciclo", schema="sc_omnicanal")
