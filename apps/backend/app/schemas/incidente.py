from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.constants import EstadoIncidente, NivelSeveridad, TipoCanal
from app.schemas.common import GeoPoint


class EvidenciaCreate(BaseModel):
    tipo_archivo: str = Field(..., min_length=2, max_length=50)
    nombre_archivo: str = Field(..., min_length=1, max_length=255)
    url_archivo: str = Field(..., min_length=8)
    tamano_bytes: int | None = Field(default=None, ge=0)
    mime_type: str | None = Field(default=None, max_length=100)
    descripcion: str | None = None


class IncidenteCreateRequest(BaseModel):
    descripcion: str = Field(..., min_length=1)
    canal_origen: TipoCanal
    ubicacion_texto: str | None = Field(default=None, max_length=255)
    coordenadas: GeoPoint | None = None
    evidencias: list[EvidenciaCreate] = Field(default_factory=list, max_length=10)
    metadata_canal: dict[str, Any] = Field(default_factory=dict)
    correlation_id: str | None = Field(default=None, max_length=120)
    categoria: str | None = Field(default=None, max_length=100)
    severidad: NivelSeveridad | None = None

    @model_validator(mode="after")
    def validate_location(self) -> "IncidenteCreateRequest":
        if not self.ubicacion_texto and not self.coordenadas:
            raise ValueError("Debes enviar ubicacion_texto o coordenadas")
        return self


class IncidenteCreateItem(BaseModel):
    id: str
    codigo: str
    estado: EstadoIncidente
    canal_origen: TipoCanal
    fecha_registro: datetime


class IncidenteCreateResponse(BaseModel):
    success: bool = True
    message: str
    incident: IncidenteCreateItem
    reporte_entrante_id: str
    es_correlacionado: bool


class IncidenteListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    codigo: str
    titulo: str
    descripcion: str
    estado: EstadoIncidente
    severidad: NivelSeveridad | None
    categoria: str | None
    zona: str | None
    canal_origen: TipoCanal
    reportante_nombre: str
    operador_nombre: str | None
    fecha_registro: datetime


class IncidenteListResponse(BaseModel):
    items: list[IncidenteListItem]
    total: int


class HistorialIncidenteItem(BaseModel):
    id: str
    estado_anterior: EstadoIncidente | None
    estado_nuevo: EstadoIncidente
    accion: str
    comentario: str | None
    ejecutado_por_nombre: str | None
    created_at: datetime


class EvidenciaItem(BaseModel):
    id: str
    tipo_archivo: str
    nombre_archivo: str
    url_archivo: str
    mime_type: str | None
    descripcion: str | None
    created_at: datetime


class UbicacionIncidenteItem(BaseModel):
    id: str
    descripcion: str | None
    fuente: str | None
    latitud: float | None
    longitud: float | None
    precision_metros: float | None
    created_at: datetime


class IncidenteDetailResponse(IncidenteListItem):
    lugar_referencia: str | None
    reportante_id: str
    operador_asignado_id: str | None
    supervisor_id: str | None
    es_anonimo: bool
    updated_at: datetime
    historial: list[HistorialIncidenteItem]
    evidencias: list[EvidenciaItem]
    ubicaciones: list[UbicacionIncidenteItem]
