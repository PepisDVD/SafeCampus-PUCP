"""
📁 apps/backend/app/schemas/incidente.py
🎯 Schemas Pydantic del módulo de incidentes — request/response del API.
📦 Capa: Schemas
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

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