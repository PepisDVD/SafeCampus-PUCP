from app.models.base import SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.sc_acompanamiento import (
    AcompanamientoSeguro,
    AlertaAcompanamiento,
    EventoAcompanamiento,
    UbicacionTrayecto,
)
from app.models.sc_auditoria import RegistroAuditoria
from app.models.sc_alertas import (
    AlertaCampus,
    AlertaEntrega,
    AlertaEvento,
    AlertaSegmento,
    AlertaZona,
    PlantillaAlerta,
    PuntoInteres,
    ReglaAlerta,
    ZonaGeografica,
)
from app.models.sc_clasificacion import ClasificacionIa, ReglaClasificacion
from app.models.sc_dashboard import EstadoIntegracion
from app.models.sc_dashboard import KpiOperativo, ReporteExportado
from app.models.sc_incidentes import (
    AsignacionRecurso,
    ComentarioIncidente,
    Evidencia,
    ExpedienteCierre,
    HistorialIncidente,
    Incidente,
    UbicacionIncidente,
)
from app.models.sc_lost_found import CategoriaObjeto, CasoLostFound, HistorialCasoLf, MotivoCierreLf
from app.models.sc_maestros import UbicacionMaestra
from app.models.sc_notificaciones import (
    Notificacion,
    PlantillaNotificacion,
    PreferenciaNotificacion,
)
from app.models.sc_omnicanal import (
    CanalReporte,
    ChatbotEstadoConversacion,
    ChatbotLlmUsage,
    Conversacion,
    EventoConversacion,
    MensajeConversacion,
    ReporteEntrante,
)
from app.models.sc_users import (
    DispositivoUsuario,
    Permiso,
    Rol,
    RolPermiso,
    Sesion,
    Usuario,
    UsuarioRol,
)

__all__ = [
    "AcompanamientoSeguro",
    "AlertaCampus",
    "AlertaAcompanamiento",
    "AlertaEntrega",
    "AlertaEvento",
    "AlertaSegmento",
    "AlertaZona",
    "AsignacionRecurso",
    "CanalReporte",
    "CasoLostFound",
    "CategoriaObjeto",
    "ChatbotEstadoConversacion",
    "ChatbotLlmUsage",
    "ClasificacionIa",
    "ComentarioIncidente",
    "Conversacion",
    "DispositivoUsuario",
    "EstadoIntegracion",
    "EventoConversacion",
    "EventoAcompanamiento",
    "Evidencia",
    "ExpedienteCierre",
    "HistorialCasoLf",
    "HistorialIncidente",
    "Incidente",
    "KpiOperativo",
    "MensajeConversacion",
    "MotivoCierreLf",
    "Notificacion",
    "Permiso",
    "PlantillaAlerta",
    "PlantillaNotificacion",
    "PreferenciaNotificacion",
    "PuntoInteres",
    "RegistroAuditoria",
    "ReglaAlerta",
    "ReglaClasificacion",
    "ReporteEntrante",
    "ReporteExportado",
    "Rol",
    "RolPermiso",
    "Sesion",
    "SoftDeleteMixin",
    "TimestampMixin",
    "UbicacionIncidente",
    "UbicacionMaestra",
    "UbicacionTrayecto",
    "Usuario",
    "UsuarioRol",
    "UUIDPrimaryKeyMixin",
    "ZonaGeografica",
]
