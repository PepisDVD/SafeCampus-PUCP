from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

# Vocabulario controlado de tipos de ubicación. Debe mantenerse alineado con
# la migración `20260514_0018` y con el frontend (`shared-types`).
TipoUbicacion = Literal[
    "PABELLON",
    "FACULTAD",
    "BIBLIOTECA",
    "LABORATORIO",
    "AUDITORIO",
    "CAFETERIA",
    "AREA_DEPORTIVA",
    "AREA_COMUN",
    "ADMINISTRATIVO",
    "ESTACIONAMIENTO",
    "ACCESO",
    "OTRO",
]


class UbicacionMaestraItem(BaseModel):
    id: str
    codigo: str
    nombre: str
    tipo: TipoUbicacion
    latitud: float
    longitud: float
    activa: bool
    # True si la ubicación está referenciada por otras entidades (alertas,
    # puntos de interés, segmentos). Cuando es True no puede eliminarse.
    tiene_relaciones: bool = False
    created_at: datetime
    updated_at: datetime


class UbicacionMaestraCreateInput(BaseModel):
    codigo: str = Field(min_length=2, max_length=40)
    nombre: str = Field(min_length=2, max_length=120)
    tipo: TipoUbicacion = "OTRO"
    latitud: float = Field(ge=-90, le=90)
    longitud: float = Field(ge=-180, le=180)
    activa: bool = True


class UbicacionMaestraUpdateInput(BaseModel):
    """El código es inmutable tras el registro, por eso no se incluye aquí."""

    nombre: str = Field(min_length=2, max_length=120)
    tipo: TipoUbicacion = "OTRO"
    latitud: float = Field(ge=-90, le=90)
    longitud: float = Field(ge=-180, le=180)
    activa: bool = True
