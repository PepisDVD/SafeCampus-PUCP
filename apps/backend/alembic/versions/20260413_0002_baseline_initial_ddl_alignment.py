"""
📁 apps/backend/alembic/versions/20260413_0002_baseline_initial_ddl_alignment.py
🎯 Alinear Alembic con el DDL inicial cargado en Supabase y validar objetos críticos.
📦 Capa: Infraestructura / Migraciones
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260413_0002"
down_revision: Union[str, None] = "20260413_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Esta migración asume que el DDL base del proyecto ya fue aplicado en Supabase
    (infra/db/initial_DLL.sql) y valida consistencia mínima para el equipo.
    """
    # Mantener compatibilidad: si existe sc_kpi legado y no existe sc_dashboard, renombrar.
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'sc_kpi')
               AND NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'sc_dashboard') THEN
                EXECUTE 'ALTER SCHEMA sc_kpi RENAME TO sc_dashboard';
            END IF;
        END
        $$;
        """
    )

    # Validaciones de objetos críticos del DDL inicial.
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'sc_users' AND table_name = 'usuario'
            ) THEN
                RAISE EXCEPTION 'No existe sc_users.usuario. Ejecuta infra/db/initial_DLL.sql en Supabase y luego reintenta alembic upgrade head.';
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'sc_incidentes' AND table_name = 'incidente'
            ) THEN
                RAISE EXCEPTION 'No existe sc_incidentes.incidente. Ejecuta infra/db/initial_DLL.sql en Supabase y luego reintenta alembic upgrade head.';
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'sc_dashboard' AND table_name = 'estado_integracion'
            ) THEN
                RAISE EXCEPTION 'No existe sc_dashboard.estado_integracion. Ejecuta infra/db/initial_DLL.sql en Supabase y luego reintenta alembic upgrade head.';
            END IF;

            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_usuario') THEN
                RAISE EXCEPTION 'No existe el ENUM estado_usuario. Ejecuta infra/db/initial_DLL.sql en Supabase y luego reintenta alembic upgrade head.';
            END IF;
        END
        $$;
        """
    )


def downgrade() -> None:
    # Migración de alineación/validación: no realiza cambios reversibles sobre el modelo.
    pass
