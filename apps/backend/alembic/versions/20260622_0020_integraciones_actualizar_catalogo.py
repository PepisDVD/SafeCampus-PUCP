"""Actualiza el catálogo monitoreado de integraciones externas.

Cambios sobre ``sc_dashboard.estado_integracion``:

  - Elimina integraciones que ya no se usan: ``whatsapp_gateway``, ``google_maps``
    (reemplazado por Leaflet/OpenStreetMap), ``gmail_oauth`` y ``push_notifications``.
  - Renombra ``openai_api`` -> ``openai`` (clave canónica usada por el health check).
  - Inserta las nuevas integraciones monitoreadas:
      * ``gemini``             -> LLM Google Gemini (Mensajes / Incidentes).
      * ``resend``            -> envío de correos/notificaciones.
      * ``whatsapp_evolution`` -> WhatsApp vía EvolutionAPI (dev, Docker local).
      * ``whatsapp_meta``     -> WhatsApp Business vía Meta Cloud API (prod).
      * ``leaflet``           -> mapas con Leaflet / tiles de OpenStreetMap.

La inserción es idempotente gracias al UNIQUE ``uq_integracion_servicio``.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260622_0020"
down_revision: str | None = "20260622_0019"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


NUEVOS_SERVICIOS = (
    "openai",
    "gemini",
    "resend",
    "whatsapp_evolution",
    "whatsapp_meta",
    "leaflet",
)

SERVICIOS_OBSOLETOS = (
    "whatsapp_gateway",
    "google_maps",
    "gmail_oauth",
    "push_notifications",
)


def upgrade() -> None:
    # Renombrar openai_api -> openai conservando su historial.
    op.execute(
        "UPDATE sc_dashboard.estado_integracion "
        "SET servicio = 'openai' "
        "WHERE servicio = 'openai_api' "
        "AND NOT EXISTS ("
        "  SELECT 1 FROM sc_dashboard.estado_integracion WHERE servicio = 'openai'"
        ")"
    )

    # Eliminar integraciones que ya no se monitorean.
    obsoletos = ", ".join(f"'{s}'" for s in SERVICIOS_OBSOLETOS) + ", 'openai_api'"
    op.execute(f"DELETE FROM sc_dashboard.estado_integracion WHERE servicio IN ({obsoletos})")

    # Insertar el set vigente (idempotente por UNIQUE en servicio).
    valores = ", ".join(f"('{s}', 'DESCONOCIDO')" for s in NUEVOS_SERVICIOS)
    op.execute(
        "INSERT INTO sc_dashboard.estado_integracion (servicio, estado) "
        f"VALUES {valores} "
        "ON CONFLICT (servicio) DO NOTHING"
    )


def downgrade() -> None:
    nuevos = ", ".join(f"'{s}'" for s in NUEVOS_SERVICIOS)
    op.execute(f"DELETE FROM sc_dashboard.estado_integracion WHERE servicio IN ({nuevos})")
    op.execute(
        "INSERT INTO sc_dashboard.estado_integracion (servicio, estado) VALUES "
        "('openai_api', 'DESCONOCIDO'), "
        "('whatsapp_gateway', 'DESCONOCIDO'), "
        "('google_maps', 'DESCONOCIDO'), "
        "('gmail_oauth', 'DESCONOCIDO'), "
        "('push_notifications', 'DESCONOCIDO') "
        "ON CONFLICT (servicio) DO NOTHING"
    )
