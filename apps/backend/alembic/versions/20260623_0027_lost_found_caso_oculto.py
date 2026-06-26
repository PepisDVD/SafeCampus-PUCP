"""Lost & Found — visibilidad comunitaria del hilo (oculto).

Agrega ``sc_lost_found.caso_lost_found.oculto`` (boolean) para que un
administrador pueda ocultar un hilo del feed de la comunidad sin cerrarlo ni
borrarlo. Un hilo puede estar oculto y a la vez abierto o cerrado.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260623_0027"
down_revision: str | None = "20260623_0026"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE sc_lost_found.caso_lost_found
            ADD COLUMN IF NOT EXISTS oculto boolean NOT NULL DEFAULT false;
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE sc_lost_found.caso_lost_found DROP COLUMN IF EXISTS oculto;")
