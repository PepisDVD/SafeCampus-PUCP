"""
Add `tipo` classification column to sc_maestros.ubicacion_maestra.

Permite clasificar cada ubicación del catálogo (pabellón, biblioteca, etc.)
para mostrarla de forma compacta en la tabla y filtrarla en el sistema.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260514_0018"
down_revision: str | None = "20260514_0017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# Valores permitidos para el tipo de ubicación (debe coincidir con el backend
# `app.schemas.maestros.TIPOS_UBICACION` y el frontend shared-types).
_TIPOS = (
    "PABELLON",
    "FACULTAD",
    "BIBLIOTECA",
    "LABORATORIO",
    "AUDITORIO",
    "CAFETERIA",
    "AREA_DEPORTIVA",
    "AREA_COMUN",
    "ADMINISTRATIVO",
    "ESTACIONAMIENTO",
    "ACCESO",
    "OTRO",
)


def upgrade() -> None:
    op.add_column(
        "ubicacion_maestra",
        sa.Column("tipo", sa.String(length=40), server_default="OTRO", nullable=False),
        schema="sc_maestros",
    )
    op.create_check_constraint(
        "ck_ubicacion_maestra_tipo",
        "ubicacion_maestra",
        "tipo IN ('" + "', '".join(_TIPOS) + "')",
        schema="sc_maestros",
    )

    # Clasificación inicial de las ubicaciones semilla conocidas.
    op.execute(
        """
        UPDATE sc_maestros.ubicacion_maestra
        SET tipo = CASE
            WHEN codigo LIKE 'PABELLON%' THEN 'PABELLON'
            WHEN codigo LIKE 'BIBLIOTECA%' THEN 'BIBLIOTECA'
            WHEN codigo LIKE 'CAFETERIA%' THEN 'CAFETERIA'
            WHEN codigo LIKE 'ESTACIONAMIENTO%' THEN 'ESTACIONAMIENTO'
            WHEN codigo LIKE 'PATIO%' THEN 'AREA_COMUN'
            ELSE 'OTRO'
        END;
        """
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_ubicacion_maestra_tipo",
        "ubicacion_maestra",
        schema="sc_maestros",
        type_="check",
    )
    op.drop_column("ubicacion_maestra", "tipo", schema="sc_maestros")
