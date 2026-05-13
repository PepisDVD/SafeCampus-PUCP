from app.models.base import SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.sc_acompanamiento import (
    AcompanamientoSeguro,
    AlertaAcompanamiento,
    EventoAcompanamiento,
    UbicacionTrayecto,
)
from app.models.sc_auditoria import RegistroAuditoria
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
from app.models.sc_lost_found import CategoriaObjeto, CasoLostFound, HistorialCasoLf
from app.models.sc_notificaciones import (
    Notificacion,
    PlantillaNotificacion,
    PreferenciaNotificacion,
)
from app.models.sc_omnicanal import CanalReporte, ReporteEntrante
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
    "AlertaAcompanamiento",
    "AsignacionRecurso",
    "CanalReporte",
    "CasoLostFound",
    "CategoriaObjeto",
    "ClasificacionIa",
    "ComentarioIncidente",
    "DispositivoUsuario",
    "EstadoIntegracion",
    "EventoAcompanamiento",
    "Evidencia",
    "ExpedienteCierre",
    "HistorialCasoLf",
    "HistorialIncidente",
    "Incidente",
    "KpiOperativo",
    "Notificacion",
    "Permiso",
    "PlantillaNotificacion",
    "PreferenciaNotificacion",
    "RegistroAuditoria",
    "ReglaClasificacion",
    "ReporteEntrante",
    "ReporteExportado",
    "Rol",
    "RolPermiso",
    "Sesion",
    "SoftDeleteMixin",
    "TimestampMixin",
    "UbicacionIncidente",
    "UbicacionTrayecto",
    "Usuario",
    "UsuarioRol",
    "UUIDPrimaryKeyMixin",
]
