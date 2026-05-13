"""Add incident closure dossier

Revision ID: 20260513_0006
Revises: 20260424_0005
Create Date: 2026-05-13
"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260513_0006"
down_revision: str | None = "20260424_0005"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS sc_incidentes.expediente_cierre (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            incidente_id UUID NOT NULL UNIQUE
                REFERENCES sc_incidentes.incidente(id) ON DELETE CASCADE,
            resumen_cierre TEXT NOT NULL,
            resultado TEXT,
            snapshot JSONB NOT NULL,
            generado_por_id UUID NOT NULL REFERENCES sc_users.usuario(id),
            pdf_url TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """,
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_expediente_cierre_incidente
            ON sc_incidentes.expediente_cierre (incidente_id);
        """,
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_expediente_cierre_generado_por
            ON sc_incidentes.expediente_cierre (generado_por_id);
        """,
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_expediente_cierre_created_at
            ON sc_incidentes.expediente_cierre (created_at);
        """,
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS sc_incidentes.expediente_cierre;")
