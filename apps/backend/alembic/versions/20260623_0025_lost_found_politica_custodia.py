"""Lost & Found — política de custodia y ledger de recordatorios.

Cambios:
  - Siembra (idempotente) la configuración singleton ``custodia.politica`` en
    ``sc_lost_found.configuracion_lf`` con los plazos por defecto.
  - Crea ``sc_lost_found.recordatorio_custodia_lf``: ledger de idempotencia de
    recordatorios de vencimiento (evita reenviar el mismo recordatorio). El
    sistema de notificaciones existente es el canal de entrega; esta tabla sólo
    registra qué recordatorios ya fueron generados.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260623_0025"
down_revision: str | None = "20260623_0024"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO sc_lost_found.configuracion_lf (key, value, descripcion)
        VALUES (
            'custodia.politica',
            '{
                "dias_maximos_custodia": 30,
                "dias_alerta_vencimiento": 7,
                "dias_recordatorio_previo": 3,
                "horas_maximas_perecibles": 24,
                "horas_alerta_perecible": 6,
                "version": 1
            }'::jsonb,
            'Política de custodia: plazos de vencimiento y recordatorios (objetos normales y perecibles).'
        )
        ON CONFLICT (key) DO NOTHING;
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS sc_lost_found.recordatorio_custodia_lf (
            id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            custodia_id      uuid NOT NULL REFERENCES sc_lost_found.custodia_objeto(id) ON DELETE CASCADE,
            tipo             varchar(40) NOT NULL,
            fecha_referencia timestamptz NOT NULL,
            enviado_at       timestamptz,
            estado           varchar(20) NOT NULL DEFAULT 'PENDIENTE',
            created_at       timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT uq_recordatorio_custodia UNIQUE (custodia_id, tipo, fecha_referencia)
        );
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_recordatorio_custodia_estado
        ON sc_lost_found.recordatorio_custodia_lf (estado, fecha_referencia);
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS sc_lost_found.recordatorio_custodia_lf;")
    op.execute("DELETE FROM sc_lost_found.configuracion_lf WHERE key = 'custodia.politica';")
