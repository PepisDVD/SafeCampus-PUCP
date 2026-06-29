"""Lost & Found: origen de registros operativos moviles.

Revision ID: 20260627_0035
Revises: 20260627_0034
Create Date: 2026-06-27
"""

import sqlalchemy as sa

from alembic import op

revision = "20260627_0035"
down_revision = "20260627_0034"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "caso_lost_found",
        sa.Column("origen", sa.String(length=40), nullable=False, server_default="COMUNIDAD"),
        schema="sc_lost_found",
    )
    op.create_index(
        "idx_lf_caso_origen_created",
        "caso_lost_found",
        ["origen", "created_at"],
        schema="sc_lost_found",
    )


def downgrade() -> None:
    op.drop_index(
        "idx_lf_caso_origen_created", table_name="caso_lost_found", schema="sc_lost_found"
    )
    op.drop_column("caso_lost_found", "origen", schema="sc_lost_found")
