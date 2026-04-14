"""
📁 apps/backend/alembic/versions/20260413_0001_init_schemas_enums.py
🎯 Migración inicial: extensiones, esquemas funcionales y ENUMs canónicos.
📦 Capa: Infraestructura / Migraciones
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260413_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Extensiones requeridas
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
    op.execute('CREATE EXTENSION IF NOT EXISTS "postgis";')

    # Esquemas lógicos
    op.execute("CREATE SCHEMA IF NOT EXISTS sc_users;")
    op.execute("CREATE SCHEMA IF NOT EXISTS sc_omnicanal;")
    op.execute("CREATE SCHEMA IF NOT EXISTS sc_incidentes;")
    op.execute("CREATE SCHEMA IF NOT EXISTS sc_clasificacion;")
    op.execute("CREATE SCHEMA IF NOT EXISTS sc_notificaciones;")
    op.execute("CREATE SCHEMA IF NOT EXISTS sc_dashboard;")
    op.execute("CREATE SCHEMA IF NOT EXISTS sc_lost_found;")
    op.execute("CREATE SCHEMA IF NOT EXISTS sc_acompanamiento;")
    op.execute("CREATE SCHEMA IF NOT EXISTS sc_auditoria;")

    # ENUMs canónicos (idempotente para ambientes compartidos)
    op.execute(
        """
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_usuario') THEN
                CREATE TYPE estado_usuario AS ENUM ('ACTIVO', 'INACTIVO', 'SUSPENDIDO');
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_sesion') THEN
                CREATE TYPE estado_sesion AS ENUM ('ACTIVA', 'EXPIRADA', 'REVOCADA');
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_dispositivo') THEN
                CREATE TYPE tipo_dispositivo AS ENUM ('WEB', 'MOVIL', 'TABLET');
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_canal') THEN
                CREATE TYPE tipo_canal AS ENUM ('WEB', 'MOVIL', 'MENSAJERIA');
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_reporte') THEN
                CREATE TYPE estado_reporte AS ENUM ('RECIBIDO', 'NORMALIZADO', 'ENRUTADO', 'ERROR');
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_incidente') THEN
                CREATE TYPE estado_incidente AS ENUM (
                    'RECIBIDO', 'EN_EVALUACION', 'EN_ATENCION', 'ESCALADO', 'PENDIENTE_INFO', 'RESUELTO', 'CERRADO'
                );
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nivel_severidad') THEN
                CREATE TYPE nivel_severidad AS ENUM ('BAJO', 'MEDIO', 'ALTO', 'CRITICO');
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'origen_clasificacion') THEN
                CREATE TYPE origen_clasificacion AS ENUM ('IA', 'REGLA', 'FALLBACK', 'HUMANO');
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'canal_notificacion') THEN
                CREATE TYPE canal_notificacion AS ENUM ('EMAIL', 'PUSH', 'SMS', 'WHATSAPP', 'INAPP');
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_notificacion') THEN
                CREATE TYPE estado_notificacion AS ENUM ('PENDIENTE', 'ENVIADA', 'FALLIDA', 'DESCARTADA');
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_kpi') THEN
                CREATE TYPE tipo_kpi AS ENUM ('FRT', 'TMR', 'VOLUMEN', 'DISTRIBUCION', 'TASA_RESOLUCION');
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_caso_lf') THEN
                CREATE TYPE tipo_caso_lf AS ENUM ('PERDIDO', 'ENCONTRADO');
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_caso_lf') THEN
                CREATE TYPE estado_caso_lf AS ENUM ('ABIERTO', 'EN_REVISION', 'DEVUELTO', 'DESCARTADO', 'CERRADO');
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_acompanamiento') THEN
                CREATE TYPE estado_acompanamiento AS ENUM ('PENDIENTE', 'ACTIVO', 'ALERTA', 'FINALIZADO', 'CANCELADO');
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_alerta_as') THEN
                CREATE TYPE tipo_alerta_as AS ENUM ('MANUAL', 'VENCIMIENTO', 'DESCONEXION');
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_alerta') THEN
                CREATE TYPE estado_alerta AS ENUM ('ACTIVA', 'ATENDIDA', 'CANCELADA');
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_evento_as') THEN
                CREATE TYPE tipo_evento_as AS ENUM ('INICIO', 'ALERTA', 'DESCONEXION', 'RECONEXION', 'FIN', 'CANCELACION');
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_servicio') THEN
                CREATE TYPE estado_servicio AS ENUM ('OK', 'DEGRADADO', 'CAIDO', 'DESCONOCIDO');
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    # Drop ENUMs en orden inverso
    op.execute("DROP TYPE IF EXISTS estado_servicio;")
    op.execute("DROP TYPE IF EXISTS tipo_evento_as;")
    op.execute("DROP TYPE IF EXISTS estado_alerta;")
    op.execute("DROP TYPE IF EXISTS tipo_alerta_as;")
    op.execute("DROP TYPE IF EXISTS estado_acompanamiento;")

    op.execute("DROP TYPE IF EXISTS estado_caso_lf;")
    op.execute("DROP TYPE IF EXISTS tipo_caso_lf;")

    op.execute("DROP TYPE IF EXISTS tipo_kpi;")

    op.execute("DROP TYPE IF EXISTS estado_notificacion;")
    op.execute("DROP TYPE IF EXISTS canal_notificacion;")

    op.execute("DROP TYPE IF EXISTS origen_clasificacion;")

    op.execute("DROP TYPE IF EXISTS nivel_severidad;")
    op.execute("DROP TYPE IF EXISTS estado_incidente;")

    op.execute("DROP TYPE IF EXISTS estado_reporte;")
    op.execute("DROP TYPE IF EXISTS tipo_canal;")

    op.execute("DROP TYPE IF EXISTS tipo_dispositivo;")
    op.execute("DROP TYPE IF EXISTS estado_sesion;")
    op.execute("DROP TYPE IF EXISTS estado_usuario;")

    # Drop esquemas en orden inverso
    op.execute("DROP SCHEMA IF EXISTS sc_auditoria CASCADE;")
    op.execute("DROP SCHEMA IF EXISTS sc_acompanamiento CASCADE;")
    op.execute("DROP SCHEMA IF EXISTS sc_lost_found CASCADE;")
    op.execute("DROP SCHEMA IF EXISTS sc_dashboard CASCADE;")
    op.execute("DROP SCHEMA IF EXISTS sc_notificaciones CASCADE;")
    op.execute("DROP SCHEMA IF EXISTS sc_clasificacion CASCADE;")
    op.execute("DROP SCHEMA IF EXISTS sc_incidentes CASCADE;")
    op.execute("DROP SCHEMA IF EXISTS sc_omnicanal CASCADE;")
    op.execute("DROP SCHEMA IF EXISTS sc_users CASCADE;")
