"""
Create schema sc_maestros and base table ubicacion_maestra.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260514_0014"
down_revision: str | None = "20260514_0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS sc_maestros;")

    op.create_table(
        "ubicacion_maestra",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("codigo", sa.String(length=40), nullable=False),
        sa.Column("nombre", sa.String(length=120), nullable=False),
        sa.Column("latitud", sa.Numeric(9, 6), nullable=False),
        sa.Column("longitud", sa.Numeric(9, 6), nullable=False),
        sa.Column("activa", sa.Boolean(), server_default="true", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("latitud >= -90 AND latitud <= 90", name="ck_ubicacion_maestra_latitud"),
        sa.CheckConstraint(
            "longitud >= -180 AND longitud <= 180", name="ck_ubicacion_maestra_longitud"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("codigo", name="uq_ubicacion_maestra_codigo"),
        sa.UniqueConstraint("nombre", name="uq_ubicacion_maestra_nombre"),
        schema="sc_maestros",
    )


def downgrade() -> None:
    op.drop_table("ubicacion_maestra", schema="sc_maestros")
    op.execute("DROP SCHEMA IF EXISTS sc_maestros;")
