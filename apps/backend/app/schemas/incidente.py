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
    canal_origen: TipoCanal
    operador_nombre: str | None = None
    operador_avatar_url: str | None = None
    created_at: datetime | None = None


class IncidenteListResponse(BaseModel):
    items: list[IncidenteListItem]
    total: int


class IncidenteCreateInput(BaseModel):
    titulo: str = Field(min_length=3, max_length=200)
    descripcion: str = Field(min_length=10)
    categoria: str | None = Field(default=None, max_length=100)
    lugar_referencia: str | None = Field(default=None, max_length=255)
    latitud: float | None = None
    longitud: float | None = None


class IncidenteCreated(BaseModel):
    id: str
    codigo: str
    estado: EstadoIncidente
    created_at: datetime


class UsuarioMini(BaseModel):
    """Representación reducida de un usuario para mostrar en el detalle."""

    id: str
    nombre_completo: str
    email: EmailStr | None = None
    avatar_url: str | None = None


class HistorialEvento(BaseModel):
    id: str
    estado_anterior: EstadoIncidente | None = None
    estado_nuevo: EstadoIncidente
    accion: str
    comentario: str | None = None
    ejecutado_por: UsuarioMini | None = None
    created_at: datetime


class IncidenteDetail(BaseModel):
    id: str
    codigo: str
    titulo: str
    descripcion: str
    estado: EstadoIncidente
    severidad: NivelSeveridad | None = None
    categoria: str | None = None
    lugar_referencia: str | None = None
    canal_origen: TipoCanal
    fecha_primera_respuesta: datetime | None = None
    fecha_resolucion: datetime | None = None
    created_at: datetime
    updated_at: datetime
    reportante: UsuarioMini | None = None
    operador_asignado: UsuarioMini | None = None
    supervisor: UsuarioMini | None = None
    historial: list[HistorialEvento] = []