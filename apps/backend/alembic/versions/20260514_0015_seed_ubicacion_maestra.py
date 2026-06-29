"""
Seed base records in sc_maestros.ubicacion_maestra.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260514_0015"
down_revision: str | None = "20260514_0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO sc_maestros.ubicacion_maestra (codigo, nombre, latitud, longitud, activa)
        VALUES
            ('BIBLIOTECA_CENTRAL', 'Biblioteca Central', -12.069440, -77.080660, true),
            ('PABELLON_A', 'Pabellon A', -12.070760, -77.080100, true),
            ('PABELLON_H', 'Pabellon H', -12.068450, -77.081670, true),
            ('CAFETERIA_CENTRAL', 'Cafeteria Central', -12.069860, -77.081170, true),
            ('PATIO_DE_LETRAS', 'Patio de Letras', -12.070200, -77.080750, true),
            ('ESTACIONAMIENTO_PRINCIPAL', 'Estacionamiento Principal', -12.068040, -77.079150, true)
        ON CONFLICT (codigo) DO NOTHING;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM sc_maestros.ubicacion_maestra
        WHERE codigo IN (
            'BIBLIOTECA_CENTRAL',
            'PABELLON_A',
            'PABELLON_H',
            'CAFETERIA_CENTRAL',
            'PATIO_DE_LETRAS',
            'ESTACIONAMIENTO_PRINCIPAL'
        );
        """
    )
