"""
PostgreSQL enum types used by SQLAlchemy models.

The enums already exist in the remote database and are owned by Alembic/DDL, so
SQLAlchemy must not try to create them from model metadata.
"""

from sqlalchemy.dialects.postgresql import ENUM

EstadoUsuarioEnum = ENUM(
    "ACTIVO",
    "INACTIVO",
    "SUSPENDIDO",
    name="estado_usuario",
    create_type=False,
)

EstadoSesionEnum = ENUM(
    "ACTIVA",
    "EXPIRADA",
    "REVOCADA",
    name="estado_sesion",
    create_type=False,
)

TipoDispositivoEnum = ENUM(
    "WEB",
    "MOVIL",
    "TABLET",
    name="tipo_dispositivo",
    create_type=False,
)

TipoCanalEnum = ENUM(
    "WEB",
    "MOVIL",
    "MENSAJERIA",
    name="tipo_canal",
    create_type=False,
)

EstadoReporteEnum = ENUM(
    "RECIBIDO",
    "NORMALIZADO",
    "ENRUTADO",
    "ERROR",
    name="estado_reporte",
    create_type=False,
)

EstadoIncidenteEnum = ENUM(
    "RECIBIDO",
    "EN_EVALUACION",
    "EN_ATENCION",
    "ESCALADO",
    "PENDIENTE_INFO",
    "RESUELTO",
    "CERRADO",
    name="estado_incidente",
    create_type=False,
)

NivelSeveridadEnum = ENUM(
    "BAJO",
    "MEDIO",
    "ALTO",
    "CRITICO",
    name="nivel_severidad",
    create_type=False,
)

OrigenClasificacionEnum = ENUM(
    "IA",
    "REGLA",
    "FALLBACK",
    "HUMANO",
    name="origen_clasificacion",
    create_type=False,
)

CanalNotificacionEnum = ENUM(
    "EMAIL",
    "PUSH",
    "SMS",
    "WHATSAPP",
    "INAPP",
    name="canal_notificacion",
    create_type=False,
)

EstadoNotificacionEnum = ENUM(
    "PENDIENTE",
    "ENVIADA",
    "FALLIDA",
    "DESCARTADA",
    name="estado_notificacion",
    create_type=False,
)

TipoKpiEnum = ENUM(
    "FRT",
    "TMR",
    "VOLUMEN",
    "DISTRIBUCION",
    "TASA_RESOLUCION",
    name="tipo_kpi",
    create_type=False,
)

EstadoServicioEnum = ENUM(
    "OK",
    "DEGRADADO",
    "CAIDO",
    "DESCONOCIDO",
    name="estado_servicio",
    create_type=False,
)

TipoCasoLfEnum = ENUM(
    "PERDIDO",
    "ENCONTRADO",
    name="tipo_caso_lf",
    create_type=False,
)

EstadoCasoLfEnum = ENUM(
    "ABIERTO",
    "EN_REVISION",
    "DEVUELTO",
    "DESCARTADO",
    "CERRADO",
    name="estado_caso_lf",
    create_type=False,
)

EstadoAcompanamientoEnum = ENUM(
    "PENDIENTE",
    "ACTIVO",
    "ALERTA",
    "FINALIZADO",
    "CANCELADO",
    name="estado_acompanamiento",
    create_type=False,
)

TipoAlertaAsEnum = ENUM(
    "MANUAL",
    "VENCIMIENTO",
    "DESCONEXION",
    name="tipo_alerta_as",
    create_type=False,
)

EstadoAlertaEnum = ENUM(
    "ACTIVA",
    "ATENDIDA",
    "CANCELADA",
    name="estado_alerta",
    create_type=False,
)

TipoEventoAsEnum = ENUM(
    "INICIO",
    "ALERTA",
    "DESCONEXION",
    "RECONEXION",
    "FIN",
    "CANCELACION",
    name="tipo_evento_as",
    create_type=False,
)
