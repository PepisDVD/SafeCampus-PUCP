"""Add incident closure expediente table.

Revision ID: 20260513_0006
Revises: 20260424_0005
Create Date: 2026-05-13
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260513_0006"
down_revision: str | None = "20260424_0005"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "expediente_cierre",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("incidente_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("resumen_cierre", sa.Text(), nullable=False),
        sa.Column("resultado", sa.Text(), nullable=True),
        sa.Column("snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("generado_por_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("pdf_url", sa.Text(), nullable=True),
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
            ["generado_por_id"],
            ["sc_users.usuario.id"],
            name="expediente_cierre_generado_por_id_fkey",
        ),
        sa.ForeignKeyConstraint(
            ["incidente_id"],
            ["sc_incidentes.incidente.id"],
            name="expediente_cierre_incidente_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="expediente_cierre_pkey"),
        sa.UniqueConstraint("incidente_id", name="expediente_cierre_incidente_id_key"),
        schema="sc_incidentes",
    )
    op.create_index(
        "idx_expediente_cierre_created_at",
        "expediente_cierre",
        ["created_at"],
        schema="sc_incidentes",
    )
    op.create_index(
        "idx_expediente_cierre_generado_por",
        "expediente_cierre",
        ["generado_por_id"],
        schema="sc_incidentes",
    )
    op.create_index(
        "idx_expediente_cierre_incidente",
        "expediente_cierre",
        ["incidente_id"],
        schema="sc_incidentes",
    )


def downgrade() -> None:
    op.drop_index(
        "idx_expediente_cierre_incidente",
        table_name="expediente_cierre",
        schema="sc_incidentes",
    )
    op.drop_index(
        "idx_expediente_cierre_generado_por",
        table_name="expediente_cierre",
        schema="sc_incidentes",
    )
    op.drop_index(
        "idx_expediente_cierre_created_at",
        table_name="expediente_cierre",
        schema="sc_incidentes",
    )
    op.drop_table("expediente_cierre", schema="sc_incidentes")
