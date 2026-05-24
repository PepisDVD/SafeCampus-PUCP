"""
Schemas for Supabase auth synchronization.
"""

from pydantic import BaseModel, EmailStr


class AuthUserResponse(BaseModel):
    id: str
    email: EmailStr
    nombre: str
    apellido: str
    avatar_url: str | None = None
    codigo_institucional: str | None = None
    telefono: str | None = None
    departamento: str | None = None
    roles: list[str]


class AuthProfileUpdateInput(BaseModel):
    nombre: str
    apellido: str
    telefono: str | None = None
    departamento: str | None = None


class OperatorLoginInput(BaseModel):
    email: EmailStr
    password: str


class SupabaseAccessTokenInput(BaseModel):
    access_token: str


class MobileAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUserResponse
