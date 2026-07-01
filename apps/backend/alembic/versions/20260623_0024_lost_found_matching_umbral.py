"""Lost & Found — configuración del umbral de matching e integridad de match_sugerido.

Cambios:
  - Siembra (idempotente) la configuración única ``matching.sugerencia`` en
    ``sc_lost_found.configuracion_lf`` con ``{"umbral": 0.55, "version": 1}``.
  - Integridad de ``sc_lost_found.match_sugerido``:
      * Verifica si existen pares ``(caso_perdido_id, caso_encontrado_id)``
        duplicados ANTES de crear la restricción única. Si los hay, la migración
        falla con un mensaje claro (NO se eliminan datos silenciosamente).
      * Si no hay duplicados, agrega ``UNIQUE (caso_perdido_id, caso_encontrado_id)``.
      * Agrega índice ``idx_match_sugerido_estado_score (estado, score_total DESC)``.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260623_0024"
down_revision: str | None = "20260623_0023"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1) Configuración única del umbral de sugerencia (no sobreescribe si ya existe).
    op.execute(
        """
        INSERT INTO sc_lost_found.configuracion_lf (key, value, descripcion)
        VALUES (
            'matching.sugerencia',
            '{"umbral": 0.55, "version": 1}'::jsonb,
            'Umbral de sugerencia del motor de matching determinístico (0.00 a 1.00).'
        )
        ON CONFLICT (key) DO NOTHING;
        """
    )

    # 2) Integridad: unicidad de pares, sin borrar datos. Falla si hay duplicados.
    op.execute(
        """
        DO $$
        DECLARE
            duplicados int;
        BEGIN
            SELECT count(*) INTO duplicados FROM (
                SELECT caso_perdido_id, caso_encontrado_id
                FROM sc_lost_found.match_sugerido
                GROUP BY caso_perdido_id, caso_encontrado_id
                HAVING count(*) > 1
            ) d;

            IF duplicados > 0 THEN
                RAISE EXCEPTION
                    'No se puede crear UNIQUE en match_sugerido: existen % par(es) duplicado(s). Resuélvelos manualmente antes de migrar.',
                    duplicados;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'uq_match_sugerido_par'
            ) THEN
                ALTER TABLE sc_lost_found.match_sugerido
                    ADD CONSTRAINT uq_match_sugerido_par UNIQUE (caso_perdido_id, caso_encontrado_id);
            END IF;
        END $$;
        """
    )

    # 3) Índice para listar/priorizar sugerencias por estado y score.
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_match_sugerido_estado_score
        ON sc_lost_found.match_sugerido (estado, score_total DESC);
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS sc_lost_found.idx_match_sugerido_estado_score;")
    op.execute(
        "ALTER TABLE sc_lost_found.match_sugerido DROP CONSTRAINT IF EXISTS uq_match_sugerido_par;"
    )
    op.execute("DELETE FROM sc_lost_found.configuracion_lf WHERE key = 'matching.sugerencia';")
