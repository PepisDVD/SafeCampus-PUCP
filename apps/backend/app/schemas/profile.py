from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class MyProfileResponse(BaseModel):
    id: str
    email: str
    nombre: str
    apellido: str
    codigo_institucional: str | None = None
    departamento: str | None = None
    telefono: str | None = None
    avatar_url: str | None = None
    estado: str
    email_verificado: bool
    ultimo_acceso: datetime | None = None
    roles: list[str] = Field(default_factory=list)


class UpdateMyProfileRequest(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=100)
    apellido: str | None = Field(default=None, min_length=2, max_length=100)
    departamento: str | None = Field(default=None, max_length=120)
    telefono: str | None = Field(default=None, max_length=20)
    avatar_url: str | None = Field(default=None, max_length=500)
