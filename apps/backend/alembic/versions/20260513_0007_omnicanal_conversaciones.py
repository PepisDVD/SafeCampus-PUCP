"""Add operational omnichannel conversations.

Revision ID: 20260513_0007
Revises: 20260513_0006
Create Date: 2026-05-13
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260513_0007"
down_revision: str | None = "20260513_0006"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "conversacion",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("canal_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("external_chat_id", sa.Text(), nullable=False),
        sa.Column("telefono_contacto", sa.String(length=32), nullable=True),
        sa.Column("nombre_contacto", sa.String(length=160), nullable=True),
        sa.Column("estado", sa.String(length=32), nullable=False, server_default="EN_BOT"),
        sa.Column("modo_atencion", sa.String(length=16), nullable=False, server_default="BOT"),
        sa.Column("prioridad", sa.String(length=16), nullable=False, server_default="MEDIO"),
        sa.Column("operador_asignado_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("tomado_por_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("tomado_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("incidente_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("ultimo_mensaje_preview", sa.Text(), nullable=True),
        sa.Column(
            "ultimo_mensaje_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("cerrado_por_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("cerrado_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("motivo_cierre", sa.Text(), nullable=True),
        sa.Column(
            "metadatos",
            postgresql.JSONB(astext_type=sa.Text()),
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
        sa.CheckConstraint(
            "estado IN ('ABIERTA', 'EN_BOT', 'EN_COLA', 'EN_ATENCION', 'CERRADA')",
            name="ck_conversacion_estado",
        ),
        sa.CheckConstraint(
            "modo_atencion IN ('BOT', 'HUMANO')",
            name="ck_conversacion_modo_atencion",
        ),
        sa.CheckConstraint(
            "prioridad IN ('BAJO', 'MEDIO', 'ALTO', 'CRITICO')",
            name="ck_conversacion_prioridad",
        ),
        sa.ForeignKeyConstraint(["canal_id"], ["sc_omnicanal.canal_reporte.id"]),
        sa.ForeignKeyConstraint(["cerrado_por_id"], ["sc_users.usuario.id"]),
        sa.ForeignKeyConstraint(["incidente_id"], ["sc_incidentes.incidente.id"]),
        sa.ForeignKeyConstraint(["operador_asignado_id"], ["sc_users.usuario.id"]),
        sa.ForeignKeyConstraint(["tomado_por_id"], ["sc_users.usuario.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("canal_id", "external_chat_id", name="uq_conversacion_canal_chat"),
        schema="sc_omnicanal",
    )
    op.create_index("idx_conversacion_estado", "conversacion", ["estado"], schema="sc_omnicanal")
    op.create_index(
        "idx_conversacion_incidente",
        "conversacion",
        ["incidente_id"],
        schema="sc_omnicanal",
    )
    op.create_index(
        "idx_conversacion_operador",
        "conversacion",
        ["operador_asignado_id"],
        schema="sc_omnicanal",
    )
    op.create_index(
        "idx_conversacion_ultimo_mensaje",
        "conversacion",
        ["ultimo_mensaje_at"],
        schema="sc_omnicanal",
    )

    op.create_table(
        "mensaje_conversacion",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("conversacion_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("external_message_id", sa.Text(), nullable=True),
        sa.Column("direccion", sa.String(length=16), nullable=False),
        sa.Column("autor_tipo", sa.String(length=16), nullable=False),
        sa.Column("autor_usuario_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("contenido", sa.Text(), nullable=True),
        sa.Column("tipo_contenido", sa.String(length=32), nullable=False, server_default="text"),
        sa.Column(
            "estado_entrega",
            sa.String(length=32),
            nullable=False,
            server_default="received",
        ),
        sa.Column(
            "payload_raw",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint("direccion IN ('INBOUND', 'OUTBOUND')", name="ck_mensaje_direccion"),
        sa.CheckConstraint(
            "autor_tipo IN ('CONTACTO', 'BOT', 'OPERADOR', 'SISTEMA')",
            name="ck_mensaje_autor_tipo",
        ),
        sa.ForeignKeyConstraint(["autor_usuario_id"], ["sc_users.usuario.id"]),
        sa.ForeignKeyConstraint(
            ["conversacion_id"],
            ["sc_omnicanal.conversacion.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "conversacion_id",
            "external_message_id",
            name="uq_mensaje_conversacion_external",
        ),
        schema="sc_omnicanal",
    )
    op.create_index(
        "idx_mensaje_conversacion_created",
        "mensaje_conversacion",
        ["conversacion_id", "created_at"],
        schema="sc_omnicanal",
    )
    op.create_index(
        "idx_mensaje_conversacion_external",
        "mensaje_conversacion",
        ["external_message_id"],
        schema="sc_omnicanal",
    )

    op.create_table(
        "evento_conversacion",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("conversacion_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tipo_evento", sa.String(length=64), nullable=False),
        sa.Column("actor_usuario_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "payload",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["actor_usuario_id"], ["sc_users.usuario.id"]),
        sa.ForeignKeyConstraint(
            ["conversacion_id"],
            ["sc_omnicanal.conversacion.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        schema="sc_omnicanal",
    )
    op.create_index(
        "idx_evento_conversacion_created",
        "evento_conversacion",
        ["conversacion_id", "created_at"],
        schema="sc_omnicanal",
    )
    op.create_index(
        "idx_evento_conversacion_tipo",
        "evento_conversacion",
        ["tipo_evento"],
        schema="sc_omnicanal",
    )


def downgrade() -> None:
    op.drop_index(
        "idx_evento_conversacion_tipo",
        table_name="evento_conversacion",
        schema="sc_omnicanal",
    )
    op.drop_index(
        "idx_evento_conversacion_created",
        table_name="evento_conversacion",
        schema="sc_omnicanal",
    )
    op.drop_table("evento_conversacion", schema="sc_omnicanal")
    op.drop_index(
        "idx_mensaje_conversacion_external",
        table_name="mensaje_conversacion",
        schema="sc_omnicanal",
    )
    op.drop_index(
        "idx_mensaje_conversacion_created",
        table_name="mensaje_conversacion",
        schema="sc_omnicanal",
    )
    op.drop_table("mensaje_conversacion", schema="sc_omnicanal")
    op.drop_index(
        "idx_conversacion_ultimo_mensaje",
        table_name="conversacion",
        schema="sc_omnicanal",
    )
    op.drop_index(
        "idx_conversacion_operador",
        table_name="conversacion",
        schema="sc_omnicanal",
    )
    op.drop_index(
        "idx_conversacion_incidente",
        table_name="conversacion",
        schema="sc_omnicanal",
    )
    op.drop_index("idx_conversacion_estado", table_name="conversacion", schema="sc_omnicanal")
    op.drop_table("conversacion", schema="sc_omnicanal")
