"""Lost & Found — interacción de comentarios y acceso al módulo.

Agrega:
- Etiquetas (``tag``), fijado y conteo de destacados a ``comentario_caso_lf``.
- ``reaccion_comentario_lf``: reacción "Destacar" (una por usuario y comentario).
- ``acceso_modulo_lf``: supervisores habilitados para el módulo operativo de L&F.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260625_0028"
down_revision: str | None = "20260623_0028"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE sc_lost_found.comentario_caso_lf
            ADD COLUMN IF NOT EXISTS tag varchar(40),
            ADD COLUMN IF NOT EXISTS fijado boolean NOT NULL DEFAULT false,
            ADD COLUMN IF NOT EXISTS fijado_at timestamptz,
            ADD COLUMN IF NOT EXISTS fijado_por_id uuid REFERENCES sc_users.usuario(id),
            ADD COLUMN IF NOT EXISTS destacados_count integer NOT NULL DEFAULT 0;
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS sc_lost_found.reaccion_comentario_lf (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            comentario_id uuid NOT NULL REFERENCES sc_lost_found.comentario_caso_lf(id) ON DELETE CASCADE,
            usuario_id uuid NOT NULL REFERENCES sc_users.usuario(id) ON DELETE CASCADE,
            created_at timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT uq_reaccion_comentario_lf UNIQUE (comentario_id, usuario_id)
        );
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_reaccion_comentario_lf_comentario
            ON sc_lost_found.reaccion_comentario_lf (comentario_id);
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS sc_lost_found.acceso_modulo_lf (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            usuario_id uuid NOT NULL UNIQUE REFERENCES sc_users.usuario(id) ON DELETE CASCADE,
            asignado_por_id uuid REFERENCES sc_users.usuario(id),
            created_at timestamptz NOT NULL DEFAULT now()
        );
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS sc_lost_found.acceso_modulo_lf;")
    op.execute("DROP TABLE IF EXISTS sc_lost_found.reaccion_comentario_lf;")
    op.execute(
        """
        ALTER TABLE sc_lost_found.comentario_caso_lf
            DROP COLUMN IF EXISTS destacados_count,
            DROP COLUMN IF EXISTS fijado_por_id,
            DROP COLUMN IF EXISTS fijado_at,
            DROP COLUMN IF EXISTS fijado,
            DROP COLUMN IF EXISTS tag;
        """
    )
