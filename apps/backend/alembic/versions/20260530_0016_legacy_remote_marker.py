"""
Legacy remote marker for databases stamped at 20260530_0016.

Some remote environments were stamped with this revision id, but the migration
file was not present in the local versions directory. Keeping this no-op marker
lets Alembic resolve the current remote revision and continue with later
migrations without touching existing schema objects.
"""

from typing import Sequence

revision: str = "20260530_0016"
down_revision: str | None = "20260514_0015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
