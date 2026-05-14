"""Allow optional incident description

Revision ID: 20260513_0009
Revises: 20260513_0008
Create Date: 2026-05-13
"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260513_0009"
down_revision: str | None = "20260513_0008"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE sc_incidentes.incidente
            ALTER COLUMN descripcion DROP NOT NULL;
        """,
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE sc_incidentes.incidente
        SET descripcion = ''
        WHERE descripcion IS NULL;
        """,
    )
    op.execute(
        """
        ALTER TABLE sc_incidentes.incidente
            ALTER COLUMN descripcion SET NOT NULL;
        """,
    )
