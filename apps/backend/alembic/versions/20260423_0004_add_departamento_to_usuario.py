"""Add departamento column to sc_users.usuario

Revision ID: 20260423_0004
Revises: 20260423_0003
Create Date: 2026-04-23
"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260423_0004"
down_revision = "20260423_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'sc_users'
                  AND table_name = 'usuario'
                  AND column_name = 'departamento'
            ) THEN
                ALTER TABLE sc_users.usuario
                ADD COLUMN departamento VARCHAR(120);
            END IF;
        END
        $$;
        """,
    )


def downgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'sc_users'
                  AND table_name = 'usuario'
                  AND column_name = 'departamento'
            ) THEN
                ALTER TABLE sc_users.usuario
                DROP COLUMN departamento;
            END IF;
        END
        $$;
        """,
    )
