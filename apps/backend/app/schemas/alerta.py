"""
Pydantic schemas for campus alerts and GIS alert operations.
"""

from datetime import datetime

from pydantic import BaseModel, Field

from app.core.constants import (
    CanalNotificacion,
    EstadoAlertaCampus,
    EstadoNotificacion,
    NivelSeveridad,
    OrigenAlerta,
    TipoSegmentoAlerta,
)


class AlertaSegmentoInput(BaseModel):
    tipo: TipoSegmentoAlerta
    valor: str = Field(min_length=1, max_length=160)
    usuario_id: str | None = None
    ubicacion_id: str | None = None
    radio_metros: int | None = Field(default=None, gt=0)


class AlertaCreateInput(BaseModel):
    tipo: str = Field(default="ALR-MAS-SEG", max_length=20)
    familia: str = Field(default="A", max_length=1)
    titulo: str = Field(min_length=4, max_length=180)
    contenido: str = Field(min_length=10, max_length=5000)
    severidad: NivelSeveridad = NivelSeveridad.MEDIO
    origen: OrigenAlerta = OrigenAlerta.MANUAL
    canales: list[CanalNotificacion] = Field(default_factory=lambda: [CanalNotificacion.INAPP])
    zona_id: str | None = None
    latitud: float | None = Field(default=None, ge=-90, le=90)
    longitud: float | None = Field(default=None, ge=-180, le=180)
    radio_metros: int | None = Field(default=None, gt=0)
    fecha_programada: datetime | None = None
    fecha_fin: datetime | None = None
    segmentos: list[AlertaSegmentoInput] = Field(default_factory=list)


class AlertaUpdateInput(BaseModel):
    tipo: str | None = Field(default=None, max_length=20)
    familia: str | None = Field(default=None, max_length=1)
    titulo: str | None = Field(default=None, min_length=4, max_length=180)
    contenido: str | None = Field(default=None, min_length=10, max_length=5000)
    severidad: NivelSeveridad | None = None
    origen: OrigenAlerta | None = None
    canales: list[CanalNotificacion] | None = None
    zona_id: str | None = None
    latitud: float | None = Field(default=None, ge=-90, le=90)
    longitud: float | None = Field(default=None, ge=-180, le=180)
    radio_metros: int | None = Field(default=None, gt=0)
    fecha_programada: datetime | None = None
    fecha_fin: datetime | None = None
    segmentos: list[AlertaSegmentoInput] | None = None


class AlertaEstadoInput(BaseModel):
    comentario: str | None = Field(default=None, max_length=800)


class AlertaSegmentoItem(BaseModel):
    id: str
    tipo: TipoSegmentoAlerta
    valor: str
    usuario_id: str | None = None
    ubicacion_id: str | None = None
    radio_metros: int | None = None


class AlertaEntregaItem(BaseModel):
    id: str
    destinatario_id: str | None = None
    destinatario_nombre: str | None = None
    destinatario_email: str | None = None
    canal: CanalNotificacion
    estado: EstadoNotificacion
    error_detalle: str | None = None
    fecha_envio: datetime | None = None
    created_at: datetime


class AlertaEventoItem(BaseModel):
    id: str
    tipo_evento: str
    actor_usuario_id: str | None = None
    actor_nombre: str | None = None
    detalle: dict
    created_at: datetime


class AlertaListItem(BaseModel):
    id: str
    codigo: str
    tipo: str
    familia: str
    titulo: str
    contenido: str
    severidad: NivelSeveridad
    estado: EstadoAlertaCampus
    origen: OrigenAlerta
    canales: list[CanalNotificacion]
    zona_id: str | None = None
    zona_nombre: str | None = None
    latitud: float | None = None
    longitud: float | None = None
    radio_metros: int | None = None
    fecha_programada: datetime | None = None
    fecha_inicio: datetime | None = None
    fecha_fin: datetime | None = None
    created_by_id: str
    created_at: datetime
    updated_at: datetime
    entregas_total: int = 0
    entregas_enviadas: int = 0
    entregas_fallidas: int = 0


class AlertaDetail(AlertaListItem):
    segmentos: list[AlertaSegmentoItem] = []
    entregas: list[AlertaEntregaItem] = []
    eventos: list[AlertaEventoItem] = []


class AlertaListResponse(BaseModel):
    items: list[AlertaListItem]
    total: int


class AlertaPublishResponse(BaseModel):
    alerta: AlertaDetail
    destinatarios: int
    entregas_creadas: int
    entregas_enviadas: int
    entregas_fallidas: int


class AlertasStatsResponse(BaseModel):
    total: int
    por_estado: dict[str, int]
    por_canal: dict[str, int]
    por_severidad: dict[str, int]
    entregas_total: int
    entregas_enviadas: int
    entregas_fallidas: int


class GisNearbyItem(BaseModel):
    tipo: str
    id: str
    codigo: str | None = None
    titulo: str
    estado: str | None = None
    severidad: str | None = None
    latitud: float
    longitud: float
    distancia_metros: float


class GisNearbyResponse(BaseModel):
    items: list[GisNearbyItem]
    total: int


class GisHeatmapPoint(BaseModel):
    tipo: str
    latitud: float
    longitud: float
    peso: float
    total: int


class GisHeatmapResponse(BaseModel):
    points: list[GisHeatmapPoint]
    total: int


class GisRouteResponse(BaseModel):
    origen_id: str
    destino_id: str
    origen_nombre: str
    destino_nombre: str
    distancia_metros: float
    puntos: list[dict[str, float]]
