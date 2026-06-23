"""Lost & Found — campos de configuración de categorías y metadatos por caso.

Fase 1 del rediseño de "Configuración Lost & Found".

Cambios sobre ``sc_lost_found.categoria_objeto``:

  - Agrega ``codigo`` (varchar) como identificador estable y legible de la
    categoría. Se backfillea desde ``nombre`` (mayúsculas, sin tildes, con ``_``)
    resolviendo colisiones con sufijo numérico antes de aplicar UNIQUE + NOT NULL.
  - Agrega ``orden_visual`` (integer NOT NULL DEFAULT 0) para ordenar las
    categorías en la UI de configuración.
  - Agrega ``updated_at`` (timestamptz NOT NULL DEFAULT now()) para trazar la
    última modificación de la categoría.

Cambios sobre ``sc_lost_found.caso_lost_found``:

  - Agrega ``metadatos`` (jsonb NOT NULL DEFAULT '{}') para los atributos
    específicos de la categoría del objeto. Los campos comunes (``marca``,
    ``color_principal``, ``subcategoria``, ``etiquetas``) se conservan intactos.

La migración es segura e idempotente: no borra ni reemplaza categorías ni casos
existentes; sólo agrega columnas y rellena valores derivados.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260622_0021"
down_revision: str | None = "20260622_0020"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- categoria_objeto: nuevas columnas (codigo nullable primero para backfill) ---
    op.execute(
        """
        ALTER TABLE sc_lost_found.categoria_objeto
            ADD COLUMN IF NOT EXISTS codigo        varchar(60),
            ADD COLUMN IF NOT EXISTS orden_visual  integer       NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS updated_at    timestamptz   NOT NULL DEFAULT now();
        """
    )

    # Backfill de codigo desde nombre: MAYÚSCULAS, sin tildes, no alfanumérico -> '_'.
    # Las colisiones se resuelven con sufijo numérico determinístico (orden por created_at, id).
    op.execute(
        """
        WITH base AS (
            SELECT
                id,
                trim(both '_' FROM regexp_replace(
                    translate(
                        upper(nombre),
                        'ÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÃÕÑ',
                        'AEIOUAEIOUAEIOUAEIOUAON'
                    ),
                    '[^A-Z0-9]+', '_', 'g'
                )) AS base_code
            FROM sc_lost_found.categoria_objeto
            WHERE codigo IS NULL
        ),
        numbered AS (
            SELECT
                id,
                CASE WHEN base_code = '' THEN 'CATEGORIA' ELSE base_code END AS base_code,
                row_number() OVER (
                    PARTITION BY CASE WHEN base_code = '' THEN 'CATEGORIA' ELSE base_code END
                    ORDER BY id
                ) AS rn
            FROM base
        )
        UPDATE sc_lost_found.categoria_objeto c
        SET codigo = CASE WHEN n.rn = 1 THEN n.base_code ELSE n.base_code || '_' || n.rn END
        FROM numbered n
        WHERE c.id = n.id;
        """
    )

    # Aplicar UNIQUE + NOT NULL una vez backfilleado.
    op.execute(
        """
        ALTER TABLE sc_lost_found.categoria_objeto
            ALTER COLUMN codigo SET NOT NULL;
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'uq_categoria_objeto_codigo'
            ) THEN
                ALTER TABLE sc_lost_found.categoria_objeto
                    ADD CONSTRAINT uq_categoria_objeto_codigo UNIQUE (codigo);
            END IF;
        END $$;
        """
    )

    # --- caso_lost_found: metadatos específicos de categoría ---
    op.execute(
        """
        ALTER TABLE sc_lost_found.caso_lost_found
            ADD COLUMN IF NOT EXISTS metadatos jsonb NOT NULL DEFAULT '{}'::jsonb;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE sc_lost_found.caso_lost_found
            DROP COLUMN IF EXISTS metadatos;
        """
    )
    op.execute(
        """
        ALTER TABLE sc_lost_found.categoria_objeto
            DROP CONSTRAINT IF EXISTS uq_categoria_objeto_codigo;
        """
    )
    op.execute(
        """
        ALTER TABLE sc_lost_found.categoria_objeto
            DROP COLUMN IF EXISTS codigo,
            DROP COLUMN IF EXISTS orden_visual,
            DROP COLUMN IF EXISTS updated_at;
        """
    )
