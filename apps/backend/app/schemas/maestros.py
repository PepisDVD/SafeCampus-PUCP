from datetime import datetime

from pydantic import BaseModel, Field


class UbicacionMaestraItem(BaseModel):
    id: str
    codigo: str
    nombre: str
    latitud: float
    longitud: float
    activa: bool
    created_at: datetime
    updated_at: datetime


class UbicacionMaestraCreateInput(BaseModel):
    codigo: str = Field(min_length=2, max_length=40)
    nombre: str = Field(min_length=2, max_length=120)
    latitud: float = Field(ge=-90, le=90)
    longitud: float = Field(ge=-180, le=180)
    activa: bool = True


class UbicacionMaestraUpdateInput(BaseModel):
    codigo: str = Field(min_length=2, max_length=40)
    nombre: str = Field(min_length=2, max_length=120)
    latitud: float = Field(ge=-90, le=90)
    longitud: float = Field(ge=-180, le=180)
    activa: bool = True
