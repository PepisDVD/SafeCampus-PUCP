"""
📁 apps/backend/app/schemas/incidente.py
🎯 Schemas Pydantic del módulo de incidentes — request/response del API.
📦 Capa: Schemas
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.constants import EstadoIncidente, NivelSeveridad, TipoCanal


class IncidenteListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    codigo: str
    titulo: str
    descripcion: str | None = None
    estado: EstadoIncidente
    severidad: NivelSeveridad | None = None
    categoria: str | None = None
    lugar_referencia: str | None = None
    latitud: float | None = None
    longitud: float | None = None
    live_location_enabled: bool = False
    live_location_updated_at: datetime | None = None
    live_location_expires_at: datetime | None = None
    canal_origen: TipoCanal
    operador_nombre: str | None = None
    operador_avatar_url: str | None = None
    created_at: datetime | None = None


class IncidenteListResponse(BaseModel):
    items: list[IncidenteListItem]
    total: int


class IncidenteMapaItem(BaseModel):
    id: str
    codigo: str
    titulo: str
    estado: EstadoIncidente
    severidad: NivelSeveridad | None = None
    categoria: str | None = None
    lugar_referencia: str | None = None
    latitud: float | None = None
    longitud: float | None = None
    live_location_enabled: bool = False
    live_location_updated_at: datetime | None = None
    created_at: datetime | None = None


class IncidenteMapaResponse(BaseModel):
    items: list[IncidenteMapaItem]
    total: int
    georreferenciados: int
    sin_coordenadas: int


class IncidenteCreateInput(BaseModel):
    titulo: str = Field(min_length=3, max_length=200)
    descripcion: str | None = Field(default=None, max_length=4000)
    severidad: NivelSeveridad | None = None
    categoria: str | None = Field(default=None, max_length=100)
    lugar_referencia: str | None = Field(default=None, max_length=255)
    latitud: float | None = None
    longitud: float | None = None
    canal_origen: TipoCanal = TipoCanal.WEB


class IncidenteCreated(BaseModel):
    id: str
    codigo: str
    estado: EstadoIncidente
    created_at: datetime


class IncidenteLiveLocationUpdate(BaseModel):
    latitud: float | None = Field(default=None, ge=-90, le=90)
    longitud: float | None = Field(default=None, ge=-180, le=180)
    precision_metros: float | None = Field(default=None, ge=0, le=10000)
    activo: bool = True


class IncidenteEstadoUpdate(BaseModel):
    estado: EstadoIncidente
    comentario: str | None = Field(default=None, max_length=2000)
    resumen_cierre: str | None = Field(default=None, min_length=20, max_length=6000)
    resultado_cierre: str | None = Field(default=None, max_length=2000)


class ExpedienteCierreAiDraft(BaseModel):
    resumen_cierre: str = Field(min_length=20, max_length=6000)
    resultado_cierre: str | None = Field(default=None, max_length=2000)


class IncidentePriorizacionAi(BaseModel):
    severidad: NivelSeveridad
    categoria_sugerida: str | None = Field(default=None, max_length=100)
    confianza: float | None = Field(default=None, ge=0, le=1)
    justificacion: str | None = Field(default=None, max_length=1200)


class IncidenteAsignacionUpdate(BaseModel):
    operador_asignado_id: str  # UUID
    comentario: str | None = Field(default=None, max_length=2000)


class OperadorListItem(BaseModel):
    id: str
    nombre_completo: str
    email: EmailStr
    avatar_url: str | None = None
    rol: str  # "operador" | "supervisor"


class UsuarioMini(BaseModel):
    """Representación reducida de un usuario para mostrar en el detalle."""

    id: str
    nombre_completo: str
    email: EmailStr | None = None
    avatar_url: str | None = None
    rol: str | None = None


class HistorialEvento(BaseModel):
    id: str
    estado_anterior: EstadoIncidente | None = None
    estado_nuevo: EstadoIncidente
    accion: str
    comentario: str | None = None
    ejecutado_por: UsuarioMini | None = None
    created_at: datetime


class ComentarioIncidenteItem(BaseModel):
    id: str
    incidente_id: str
    autor: UsuarioMini | None = None
    contenido: str
    es_interno: bool
    created_at: datetime
    updated_at: datetime


class EvidenciaIncidenteItem(BaseModel):
    id: str
    incidente_id: str
    tipo_archivo: str
    nombre_archivo: str
    url_archivo: str
    tamano_bytes: int | None = None
    mime_type: str | None = None
    descripcion: str | None = None
    cargado_por: UsuarioMini | None = None
    created_at: datetime


class ExpedienteCierreOut(BaseModel):
    id: str
    incidente_id: str
    resumen_cierre: str
    resultado: str | None = None
    snapshot: dict
    generado_por: UsuarioMini | None = None
    pdf_url: str | None = None
    created_at: datetime
    updated_at: datetime


class ComentarioIncidenteCreateInput(BaseModel):
    contenido: str = Field(min_length=2, max_length=2000)
    es_interno: bool = False


class ZonaCount(BaseModel):
    zona: str
    total: int


class DashboardStats(BaseModel):
    """Métricas agregadas para el dashboard operativo."""

    total: int
    activos: int
    criticos: int
    en_atencion: int
    resueltos_24h: int
    por_zona: list[ZonaCount] = []


class KpiCard(BaseModel):
    """Métrica con valor actual y % de cambio respecto al periodo anterior."""

    valor: float
    cambio_pct: float
    unidad: str = ""


class EvolucionPunto(BaseModel):
    fecha: str  # ISO date YYYY-MM-DD
    total: int
    resueltos: int
    criticos: int


class TipoCount(BaseModel):
    tipo: str
    total: int
    porcentaje: float


class SlaIndicador(BaseModel):
    actual: float
    objetivo: float
    unidad: str  # "min" | "%"


class KpisResponse(BaseModel):
    period: str  # "semana" | "mes" | "trimestre"
    frt: KpiCard
    tmr: KpiCard
    total_incidentes: KpiCard
    tasa_resolucion: KpiCard
    criticos: KpiCard
    sla_cumplimiento: KpiCard
    evolucion: list[EvolucionPunto]
    por_tipo: list[TipoCount]
    por_zona: list[ZonaCount]
    sla: dict[str, SlaIndicador]


class IncidenteDetail(BaseModel):
    id: str
    codigo: str
    titulo: str
    descripcion: str | None = None
    estado: EstadoIncidente
    severidad: NivelSeveridad | None = None
    categoria: str | None = None
    lugar_referencia: str | None = None
    latitud: float | None = None
    longitud: float | None = None
    live_location_enabled: bool = False
    live_location_updated_at: datetime | None = None
    live_location_expires_at: datetime | None = None
    canal_origen: TipoCanal
    fecha_primera_respuesta: datetime | None = None
    fecha_resolucion: datetime | None = None
    created_at: datetime
    updated_at: datetime
    reportante: UsuarioMini | None = None
    operador_asignado: UsuarioMini | None = None
    supervisor: UsuarioMini | None = None
    historial: list[HistorialEvento] = []
    comentarios: list[ComentarioIncidenteItem] = []
    evidencias: list[EvidenciaIncidenteItem] = []
    expediente_cierre: ExpedienteCierreOut | None = None
