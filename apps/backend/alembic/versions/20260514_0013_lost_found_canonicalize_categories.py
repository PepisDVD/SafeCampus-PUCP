"""
Canonicalize legacy Lost & Found category names after seeding the full catalog.
"""

from typing import Sequence

from alembic import op

revision: str = "20260514_0013"
down_revision: str | None = "20260514_0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        WITH mapping(old_name, new_name) AS (
            VALUES
                ('Documentos', 'Documentos e identificaciones'),
                ('Ropa y accesorios', 'Ropa y accesorios personales'),
                ('Llaves', 'Llaves y tarjetas de acceso'),
                ('Material académico', 'Útiles académicos')
        )
        UPDATE sc_lost_found.caso_lost_found c
        SET categoria_id = new_cat.id
        FROM mapping m
        JOIN sc_lost_found.categoria_objeto old_cat ON old_cat.nombre = m.old_name
        JOIN sc_lost_found.categoria_objeto new_cat ON new_cat.nombre = m.new_name
        WHERE c.categoria_id = old_cat.id;
        """
    )
    op.execute(
        """
        DELETE FROM sc_lost_found.categoria_objeto cat
        USING (
            VALUES
                ('Documentos'),
                ('Ropa y accesorios'),
                ('Llaves'),
                ('Material académico')
        ) AS legacy(nombre)
        WHERE cat.nombre = legacy.nombre;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        INSERT INTO sc_lost_found.categoria_objeto (nombre, descripcion, activa, es_perecible)
        VALUES
            ('Documentos', 'DNI, carné universitario, pasaporte, tarjetas', true, false),
            ('Ropa y accesorios', 'Casacas, mochilas, gorras, lentes, bufandas', true, false),
            ('Llaves', 'Llaves de casa, auto, candado, USB', true, false),
            ('Material académico', 'Libros, cuadernos, calculadoras, USB', true, false)
        ON CONFLICT (nombre) DO NOTHING;
        """
    )
