from datetime import datetime
import re
import unicodedata

from pydantic import BaseModel, Field, field_validator

TipoUbicacion = str


def normalizar_tipo_ubicacion(value: str) -> str:
    value = (value or "").strip()
    if not value:
        return "OTRO"
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    normalized = re.sub(r"[^A-Za-z0-9]+", "_", normalized).strip("_").upper()
    if len(normalized) < 2:
        raise ValueError("El tipo de ubicacion debe tener al menos 2 caracteres.")
    if len(normalized) > 40:
        raise ValueError("El tipo de ubicacion no puede superar 40 caracteres.")
    return normalized


class UbicacionMaestraItem(BaseModel):
    id: str
    codigo: str
    nombre: str
    tipo: TipoUbicacion
    latitud: float
    longitud: float
    activa: bool
    # True si la ubicacion esta referenciada por otras entidades (alertas,
    # puntos de interes, segmentos). Cuando es True no puede eliminarse.
    tiene_relaciones: bool = False
    created_at: datetime
    updated_at: datetime


class UbicacionMaestraCreateInput(BaseModel):
    codigo: str = Field(min_length=2, max_length=40)
    nombre: str = Field(min_length=2, max_length=120)
    tipo: TipoUbicacion = Field(default="OTRO", min_length=2, max_length=80)
    latitud: float = Field(ge=-90, le=90)
    longitud: float = Field(ge=-180, le=180)
    activa: bool = True

    @field_validator("tipo")
    @classmethod
    def _normalizar_tipo(cls, value: str) -> str:
        return normalizar_tipo_ubicacion(value)


class UbicacionMaestraUpdateInput(BaseModel):
    """El codigo es inmutable tras el registro, por eso no se incluye aqui."""

    nombre: str = Field(min_length=2, max_length=120)
    tipo: TipoUbicacion = Field(default="OTRO", min_length=2, max_length=80)
    latitud: float = Field(ge=-90, le=90)
    longitud: float = Field(ge=-180, le=180)
    activa: bool = True

    @field_validator("tipo")
    @classmethod
    def _normalizar_tipo(cls, value: str) -> str:
        return normalizar_tipo_ubicacion(value)
