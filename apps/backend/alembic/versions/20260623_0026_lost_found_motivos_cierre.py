"""Lost & Found: maestro de motivos de cierre no destructivo."""

from collections.abc import Sequence

from alembic import op

revision: str = "20260623_0026"
down_revision: str | None = "20260623_0025"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE sc_lost_found.motivo_cierre_lf (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          codigo varchar NOT NULL UNIQUE,
          nombre varchar NOT NULL UNIQUE,
          descripcion text,
          clase_cierre varchar NOT NULL CHECK (clase_cierre IN ('DEVOLUCION', 'DESCARTE', 'ADMINISTRATIVO')),
          requiere_observacion boolean NOT NULL DEFAULT false,
          requiere_validacion_entrega boolean NOT NULL DEFAULT false,
          activo boolean NOT NULL DEFAULT true,
          orden_visual integer NOT NULL DEFAULT 0,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        ALTER TABLE sc_lost_found.caso_lost_found
          ADD COLUMN motivo_cierre_id uuid NULL
          REFERENCES sc_lost_found.motivo_cierre_lf(id)
        """
    )
    op.execute(
        """
        INSERT INTO sc_lost_found.motivo_cierre_lf
          (codigo, nombre, descripcion, clase_cierre, requiere_observacion, requiere_validacion_entrega, orden_visual)
        VALUES
          ('DEVUELTO_AL_PROPIETARIO', 'Devuelto al propietario', 'Objeto entregado a su propietario tras verificar la entrega.', 'DEVOLUCION', false, true, 10),
          ('NO_RECLAMADO_DENTRO_DEL_PLAZO', 'No reclamado dentro del plazo', 'Venció el plazo de custodia sin reclamo.', 'DESCARTE', true, false, 20),
          ('REGISTRO_DUPLICADO', 'Registro duplicado', 'El caso duplica un registro existente.', 'ADMINISTRATIVO', true, false, 30),
          ('OBJETO_DESCARTADO', 'Objeto descartado', 'El objeto fue descartado conforme al flujo de custodia.', 'DESCARTE', true, false, 40),
          ('CIERRE_ADMINISTRATIVO', 'Cierre administrativo', 'Cierre efectuado por una razón administrativa.', 'ADMINISTRATIVO', true, false, 50)
        """
    )
    op.execute(
        """
        CREATE OR REPLACE FUNCTION sc_lost_found.proteger_codigo_motivo_cierre_lf()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          IF NEW.codigo IS DISTINCT FROM OLD.codigo AND EXISTS (
            SELECT 1 FROM sc_lost_found.caso_lost_found WHERE motivo_cierre_id = OLD.id
          ) THEN
            RAISE EXCEPTION 'No se puede modificar el codigo de un motivo con referencias historicas';
          END IF;
          NEW.updated_at = now();
          RETURN NEW;
        END $$
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_proteger_codigo_motivo_cierre_lf
          BEFORE UPDATE ON sc_lost_found.motivo_cierre_lf
          FOR EACH ROW EXECUTE FUNCTION sc_lost_found.proteger_codigo_motivo_cierre_lf()
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_proteger_codigo_motivo_cierre_lf ON sc_lost_found.motivo_cierre_lf")
    op.execute("DROP FUNCTION IF EXISTS sc_lost_found.proteger_codigo_motivo_cierre_lf()")
    op.execute("ALTER TABLE sc_lost_found.caso_lost_found DROP COLUMN IF EXISTS motivo_cierre_id")
    op.execute("DROP TABLE IF EXISTS sc_lost_found.motivo_cierre_lf")
