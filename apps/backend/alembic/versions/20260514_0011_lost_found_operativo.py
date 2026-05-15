"""
Lost & Found operativo: estados TO-BE, matching, chat, custodia y configuracion.
"""

from typing import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260514_0011"
down_revision: str | None = "20260513_0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TYPE estado_caso_lf ADD VALUE IF NOT EXISTS 'CONFIRMADO';")
    op.execute("ALTER TYPE estado_caso_lf ADD VALUE IF NOT EXISTS 'EN_CUSTODIA';")
    op.execute(
        """
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_match_lf') THEN
                CREATE TYPE estado_match_lf AS ENUM ('SUGERIDO', 'CONFIRMADO', 'DESCARTADO', 'EXPIRADO');
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'motivo_cierre_lf') THEN
                CREATE TYPE motivo_cierre_lf AS ENUM (
                    'CANCELADO_USUARIO', 'DEVUELTO', 'DESCARTADO', 'DONADO', 'ADMINISTRATIVO'
                );
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_custodia') THEN
                CREATE TYPE estado_custodia AS ENUM ('ACTIVA', 'PROXIMA_VENCER', 'VENCIDA', 'DEVUELTA', 'DESCARTADA');
            END IF;
        END $$;
        """
    )

    op.add_column("categoria_objeto", sa.Column("es_perecible", sa.Boolean(), server_default="false", nullable=False), schema="sc_lost_found")
    op.add_column("categoria_objeto", sa.Column("metadatos_schema", postgresql.JSONB(astext_type=sa.Text()), server_default="{}", nullable=True), schema="sc_lost_found")
    op.add_column("caso_lost_found", sa.Column("subcategoria", sa.String(length=100), nullable=True), schema="sc_lost_found")
    op.add_column("caso_lost_found", sa.Column("hora_aproximada", sa.Time(), nullable=True), schema="sc_lost_found")
    op.add_column("caso_lost_found", sa.Column("foto_adicional_urls", postgresql.JSONB(astext_type=sa.Text()), server_default="[]", nullable=True), schema="sc_lost_found")
    op.add_column("caso_lost_found", sa.Column("color_principal", sa.String(length=50), nullable=True), schema="sc_lost_found")
    op.add_column("caso_lost_found", sa.Column("marca", sa.String(length=100), nullable=True), schema="sc_lost_found")
    op.add_column("caso_lost_found", sa.Column("etiquetas", postgresql.JSONB(astext_type=sa.Text()), server_default="[]", nullable=True), schema="sc_lost_found")
    op.add_column("caso_lost_found", sa.Column("motivo_cierre", postgresql.ENUM(name="motivo_cierre_lf", create_type=False), nullable=True), schema="sc_lost_found")
    op.add_column("caso_lost_found", sa.Column("observaciones_cierre", sa.Text(), nullable=True), schema="sc_lost_found")
    op.add_column("caso_lost_found", sa.Column("ts_busqueda", sa.Text(), nullable=True), schema="sc_lost_found")
    op.add_column("caso_lost_found", sa.Column("conteo_comentarios", sa.Integer(), server_default="0", nullable=False), schema="sc_lost_found")

    op.create_table(
        "match_sugerido",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("caso_perdido_id", sa.UUID(), nullable=False),
        sa.Column("caso_encontrado_id", sa.UUID(), nullable=False),
        sa.Column("score_total", sa.Numeric(5, 4), nullable=False),
        sa.Column("score_detalle", postgresql.JSONB(astext_type=sa.Text()), server_default="{}", nullable=False),
        sa.Column("estado", postgresql.ENUM(name="estado_match_lf", create_type=False), server_default="SUGERIDO", nullable=False),
        sa.Column("respondido_por_id", sa.UUID(), nullable=True),
        sa.Column("respuesta_comentario", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["caso_encontrado_id"], ["sc_lost_found.caso_lost_found.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["caso_perdido_id"], ["sc_lost_found.caso_lost_found.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["respondido_por_id"], ["sc_users.usuario.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("caso_perdido_id", "caso_encontrado_id", name="uq_lf_match_pair"),
        schema="sc_lost_found",
    )
    op.create_index("ix_lf_match_estado", "match_sugerido", ["estado"], schema="sc_lost_found")

    op.create_table(
        "comentario_caso_lf",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("caso_id", sa.UUID(), nullable=False),
        sa.Column("autor_id", sa.UUID(), nullable=False),
        sa.Column("contenido", sa.Text(), nullable=False),
        sa.Column("visible", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("ocultado_por_id", sa.UUID(), nullable=True),
        sa.Column("motivo_ocultamiento", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["autor_id"], ["sc_users.usuario.id"]),
        sa.ForeignKeyConstraint(["caso_id"], ["sc_lost_found.caso_lost_found.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["ocultado_por_id"], ["sc_users.usuario.id"]),
        sa.PrimaryKeyConstraint("id"),
        schema="sc_lost_found",
    )
    op.create_index("ix_lf_comentario_caso_created", "comentario_caso_lf", ["caso_id", "created_at"], schema="sc_lost_found")

    op.create_table(
        "participante_hilo_lf",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("caso_id", sa.UUID(), nullable=False),
        sa.Column("usuario_id", sa.UUID(), nullable=False),
        sa.Column("suscrito", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["caso_id"], ["sc_lost_found.caso_lost_found.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["usuario_id"], ["sc_users.usuario.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("caso_id", "usuario_id", name="uq_lf_participante_hilo"),
        schema="sc_lost_found",
    )

    op.create_table(
        "custodia_objeto",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("caso_id", sa.UUID(), nullable=False),
        sa.Column("estado", postgresql.ENUM(name="estado_custodia", create_type=False), server_default="ACTIVA", nullable=False),
        sa.Column("ubicacion_custodia", sa.String(length=255), nullable=False),
        sa.Column("observaciones", sa.Text(), nullable=True),
        sa.Column("es_perecible", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("recibido_por_id", sa.UUID(), nullable=False),
        sa.Column("fecha_recepcion", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("fecha_vencimiento", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reclamante_id", sa.UUID(), nullable=True),
        sa.Column("entregado_por_id", sa.UUID(), nullable=True),
        sa.Column("metodo_verificacion", sa.String(length=100), nullable=True),
        sa.Column("fecha_devolucion", sa.DateTime(timezone=True), nullable=True),
        sa.Column("destino_descarte", sa.String(length=150), nullable=True),
        sa.Column("motivo_descarte", sa.Text(), nullable=True),
        sa.Column("fecha_descarte", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["caso_id"], ["sc_lost_found.caso_lost_found.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["entregado_por_id"], ["sc_users.usuario.id"]),
        sa.ForeignKeyConstraint(["reclamante_id"], ["sc_users.usuario.id"]),
        sa.ForeignKeyConstraint(["recibido_por_id"], ["sc_users.usuario.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("caso_id", name="uq_lf_custodia_caso"),
        schema="sc_lost_found",
    )
    op.create_index("ix_lf_custodia_estado_vencimiento", "custodia_objeto", ["estado", "fecha_vencimiento"], schema="sc_lost_found")

    op.create_table(
        "configuracion_lf",
        sa.Column("key", sa.String(length=100), nullable=False),
        sa.Column("value", postgresql.JSONB(astext_type=sa.Text()), server_default="{}", nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("updated_by_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["updated_by_id"], ["sc_users.usuario.id"]),
        sa.PrimaryKeyConstraint("key"),
        schema="sc_lost_found",
    )
    op.execute(
        """
        INSERT INTO sc_lost_found.configuracion_lf(key, value, descripcion)
        VALUES
          ('matching', '{"umbral": 0.55}', 'Configuracion del motor de matching deterministico'),
          ('custodia', '{"dias_regular": 15, "horas_perecible": 24}', 'Ventanas operativas de custodia')
        ON CONFLICT (key) DO NOTHING;
        """
    )


def downgrade() -> None:
    op.drop_table("configuracion_lf", schema="sc_lost_found")
    op.drop_index("ix_lf_custodia_estado_vencimiento", table_name="custodia_objeto", schema="sc_lost_found")
    op.drop_table("custodia_objeto", schema="sc_lost_found")
    op.drop_table("participante_hilo_lf", schema="sc_lost_found")
    op.drop_index("ix_lf_comentario_caso_created", table_name="comentario_caso_lf", schema="sc_lost_found")
    op.drop_table("comentario_caso_lf", schema="sc_lost_found")
    op.drop_index("ix_lf_match_estado", table_name="match_sugerido", schema="sc_lost_found")
    op.drop_table("match_sugerido", schema="sc_lost_found")

    for column in (
        "conteo_comentarios",
        "ts_busqueda",
        "observaciones_cierre",
        "motivo_cierre",
        "etiquetas",
        "marca",
        "color_principal",
        "foto_adicional_urls",
        "hora_aproximada",
        "subcategoria",
    ):
        op.drop_column("caso_lost_found", column, schema="sc_lost_found")
    op.drop_column("categoria_objeto", "metadatos_schema", schema="sc_lost_found")
    op.drop_column("categoria_objeto", "es_perecible", schema="sc_lost_found")
    op.execute("DROP TYPE IF EXISTS estado_custodia;")
    op.execute("DROP TYPE IF EXISTS motivo_cierre_lf;")
    op.execute("DROP TYPE IF EXISTS estado_match_lf;")
