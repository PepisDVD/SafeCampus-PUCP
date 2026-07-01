"""Incidentes: tracking posterior de ubicacion en vivo."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260626_0030"
down_revision: str | None = "20260626_0029"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "incidente",
        sa.Column(
            "live_location_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        schema="sc_incidentes",
    )
    op.add_column(
        "incidente",
        sa.Column("live_location_updated_at", sa.DateTime(timezone=True), nullable=True),
        schema="sc_incidentes",
    )
    op.add_column(
        "incidente",
        sa.Column("live_location_expires_at", sa.DateTime(timezone=True), nullable=True),
        schema="sc_incidentes",
    )
    op.create_index(
        "idx_incidente_live_location_enabled",
        "incidente",
        ["live_location_enabled"],
        schema="sc_incidentes",
    )


def downgrade() -> None:
    op.drop_index(
        "idx_incidente_live_location_enabled",
        table_name="incidente",
        schema="sc_incidentes",
    )
    op.drop_column("incidente", "live_location_expires_at", schema="sc_incidentes")
    op.drop_column("incidente", "live_location_updated_at", schema="sc_incidentes")
    op.drop_column("incidente", "live_location_enabled", schema="sc_incidentes")
