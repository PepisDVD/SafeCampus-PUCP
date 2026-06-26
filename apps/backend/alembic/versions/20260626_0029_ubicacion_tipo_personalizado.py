"""Maestros: permitir tipos personalizados de ubicacion."""

from collections.abc import Sequence

from alembic import op

revision: str = "20260626_0029"
down_revision: str | None = "20260625_0028"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_TIPOS_BASE = (
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
    op.drop_constraint(
        "ck_ubicacion_maestra_tipo",
        "ubicacion_maestra",
        schema="sc_maestros",
        type_="check",
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE sc_maestros.ubicacion_maestra
        SET tipo = 'OTRO'
        WHERE tipo NOT IN ('""" + "', '".join(_TIPOS_BASE) + """');
        """
    )
    op.create_check_constraint(
        "ck_ubicacion_maestra_tipo",
        "ubicacion_maestra",
        "tipo IN ('" + "', '".join(_TIPOS_BASE) + "')",
        schema="sc_maestros",
    )
