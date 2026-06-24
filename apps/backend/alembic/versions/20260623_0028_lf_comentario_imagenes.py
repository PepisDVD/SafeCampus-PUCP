"""Lost & Found — imágenes en comentarios y configuración de moderación.

Agrega ``sc_lost_found.comentario_caso_lf.imagenes`` (jsonb) para adjuntar hasta
3 imágenes por comentario, y siembra la configuración de moderación de hilos:

  - ``comentarios.lista_negra``: lista de palabras prohibidas validadas antes de
    publicar un comentario (primera capa de protección).
  - ``comentarios.profundidad_maxima``: profundidad máxima de respuestas anidadas.

La autorreferencia ``parent_id`` ya existe en el modelo, por lo que la recursión
de respuestas no requiere columnas adicionales.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260623_0028"
down_revision: str | None = "20260623_0027"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE sc_lost_found.comentario_caso_lf
            ADD COLUMN IF NOT EXISTS imagenes jsonb NOT NULL DEFAULT '[]'::jsonb;
        """
    )
    op.execute(
        """
        INSERT INTO sc_lost_found.configuracion_lf (key, value, descripcion)
        VALUES (
            'comentarios.lista_negra',
            '{"palabras": ["idiota", "imbecil", "estupido", "estupida", "tarado", "tarada", "mierda", "puta", "puto", "pendejo", "pendeja", "cabron", "cabrona", "marica", "maricon", "concha", "carajo", "verga", "huevon", "huevona", "conchatumadre", "ctm", "malparido", "gonorrea"]}'::jsonb,
            'Palabras prohibidas en comentarios de Lost & Found (primera capa de moderación).'
        )
        ON CONFLICT (key) DO NOTHING;
        """
    )
    op.execute(
        """
        INSERT INTO sc_lost_found.configuracion_lf (key, value, descripcion)
        VALUES (
            'comentarios.profundidad_maxima',
            '{"valor": 6}'::jsonb,
            'Profundidad máxima de respuestas anidadas en el hilo de conversación.'
        )
        ON CONFLICT (key) DO NOTHING;
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE sc_lost_found.comentario_caso_lf DROP COLUMN IF EXISTS imagenes;")
    op.execute("DELETE FROM sc_lost_found.configuracion_lf WHERE key IN ('comentarios.lista_negra', 'comentarios.profundidad_maxima');")
