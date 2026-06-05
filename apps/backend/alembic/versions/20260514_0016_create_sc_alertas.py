"""
Create sc_alertas schema for campus alert lifecycle and delivery tracking.
"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260514_0016"
down_revision: str | None = "20260530_0016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS sc_alertas;")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_alerta_campus') THEN
                CREATE TYPE estado_alerta_campus AS ENUM (
                    'BORRADOR',
                    'PROGRAMADA',
                    'ACTIVA',
                    'ENVIADA',
                    'FINALIZADA',
                    'CANCELADA'
                );
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_segmento_alerta') THEN
                CREATE TYPE tipo_segmento_alerta AS ENUM (
                    'ROL',
                    'DEPARTAMENTO',
                    'USUARIO',
                    'ZONA'
                );
            END IF;
        END $$;
        """
    )

    estado_alerta = postgresql.ENUM(
        "BORRADOR",
        "PROGRAMADA",
        "ACTIVA",
        "ENVIADA",
        "FINALIZADA",
        "CANCELADA",
        name="estado_alerta_campus",
        create_type=False,
    )
    tipo_segmento = postgresql.ENUM(
        "ROL",
        "DEPARTAMENTO",
        "USUARIO",
        "ZONA",
        name="tipo_segmento_alerta",
        create_type=False,
    )
    nivel_severidad = postgresql.ENUM(
        "BAJO",
        "MEDIO",
        "ALTO",
        "CRITICO",
        name="nivel_severidad",
        create_type=False,
    )
    canal_notificacion = postgresql.ENUM(
        "EMAIL",
        "PUSH",
        "SMS",
        "WHATSAPP",
        "INAPP",
        name="canal_notificacion",
        create_type=False,
    )
    estado_notificacion = postgresql.ENUM(
        "PENDIENTE",
        "ENVIADA",
        "FALLIDA",
        "DESCARTADA",
        name="estado_notificacion",
        create_type=False,
    )

    op.create_table(
        "alerta",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("codigo", sa.String(length=40), nullable=False),
        sa.Column("titulo", sa.String(length=180), nullable=False),
        sa.Column("contenido", sa.Text(), nullable=False),
        sa.Column("severidad", nivel_severidad, nullable=False),
        sa.Column("estado", estado_alerta, server_default="BORRADOR", nullable=False),
        sa.Column("canales", postgresql.JSONB(), server_default=sa.text("'[\"INAPP\"]'::jsonb"), nullable=False),
        sa.Column("zona_id", sa.UUID(), nullable=True),
        sa.Column("geom", sa.Text(), nullable=True),
        sa.Column("radio_metros", sa.Integer(), nullable=True),
        sa.Column("fecha_programada", sa.DateTime(timezone=True), nullable=True),
        sa.Column("fecha_inicio", sa.DateTime(timezone=True), nullable=True),
        sa.Column("fecha_fin", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_id", sa.UUID(), nullable=False),
        sa.Column("published_by_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("radio_metros IS NULL OR radio_metros > 0", name="ck_alerta_radio_metros"),
        sa.ForeignKeyConstraint(["zona_id"], ["sc_maestros.ubicacion_maestra.id"]),
        sa.ForeignKeyConstraint(["created_by_id"], ["sc_users.usuario.id"]),
        sa.ForeignKeyConstraint(["published_by_id"], ["sc_users.usuario.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("codigo", name="uq_alerta_codigo"),
        schema="sc_alertas",
    )
    op.execute(
        """
        ALTER TABLE sc_alertas.alerta
        ALTER COLUMN geom TYPE geometry(Point, 4326)
        USING geom::geometry(Point, 4326);
        """
    )
    op.create_index("idx_alerta_estado", "alerta", ["estado"], schema="sc_alertas")
    op.create_index("idx_alerta_created", "alerta", ["created_at"], schema="sc_alertas")
    op.create_index("idx_alerta_geom", "alerta", ["geom"], schema="sc_alertas", postgresql_using="gist")

    op.create_table(
        "alerta_segmento",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("alerta_id", sa.UUID(), nullable=False),
        sa.Column("tipo", tipo_segmento, nullable=False),
        sa.Column("valor", sa.String(length=160), nullable=False),
        sa.Column("usuario_id", sa.UUID(), nullable=True),
        sa.Column("ubicacion_id", sa.UUID(), nullable=True),
        sa.Column("radio_metros", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("radio_metros IS NULL OR radio_metros > 0", name="ck_alerta_segmento_radio"),
        sa.ForeignKeyConstraint(["alerta_id"], ["sc_alertas.alerta.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["usuario_id"], ["sc_users.usuario.id"]),
        sa.ForeignKeyConstraint(["ubicacion_id"], ["sc_maestros.ubicacion_maestra.id"]),
        sa.PrimaryKeyConstraint("id"),
        schema="sc_alertas",
    )
    op.create_index("idx_alerta_segmento_alerta", "alerta_segmento", ["alerta_id"], schema="sc_alertas")
    op.create_index("idx_alerta_segmento_tipo", "alerta_segmento", ["tipo"], schema="sc_alertas")

    op.create_table(
        "alerta_entrega",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("alerta_id", sa.UUID(), nullable=False),
        sa.Column("destinatario_id", sa.UUID(), nullable=True),
        sa.Column("canal", canal_notificacion, nullable=False),
        sa.Column("estado", estado_notificacion, server_default="PENDIENTE", nullable=False),
        sa.Column("notificacion_id", sa.UUID(), nullable=True),
        sa.Column("external_message_id", sa.String(length=160), nullable=True),
        sa.Column("error_detalle", sa.Text(), nullable=True),
        sa.Column("fecha_envio", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["alerta_id"], ["sc_alertas.alerta.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["destinatario_id"], ["sc_users.usuario.id"]),
        sa.ForeignKeyConstraint(["notificacion_id"], ["sc_notificaciones.notificacion.id"]),
        sa.PrimaryKeyConstraint("id"),
        schema="sc_alertas",
    )
    op.create_index("idx_alerta_entrega_alerta", "alerta_entrega", ["alerta_id"], schema="sc_alertas")
    op.create_index("idx_alerta_entrega_estado", "alerta_entrega", ["estado"], schema="sc_alertas")

    op.create_table(
        "alerta_evento",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("alerta_id", sa.UUID(), nullable=False),
        sa.Column("tipo_evento", sa.String(length=80), nullable=False),
        sa.Column("actor_usuario_id", sa.UUID(), nullable=True),
        sa.Column("detalle", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["alerta_id"], ["sc_alertas.alerta.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["actor_usuario_id"], ["sc_users.usuario.id"]),
        sa.PrimaryKeyConstraint("id"),
        schema="sc_alertas",
    )
    op.create_index("idx_alerta_evento_alerta", "alerta_evento", ["alerta_id"], schema="sc_alertas")


def downgrade() -> None:
    op.drop_table("alerta_evento", schema="sc_alertas")
    op.drop_table("alerta_entrega", schema="sc_alertas")
    op.drop_table("alerta_segmento", schema="sc_alertas")
    op.drop_table("alerta", schema="sc_alertas")
    op.execute("DROP TYPE IF EXISTS tipo_segmento_alerta;")
    op.execute("DROP TYPE IF EXISTS estado_alerta_campus;")
    op.execute("DROP SCHEMA IF EXISTS sc_alertas;")
