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


class CredentialsLoginInput(BaseModel):
    # `str` (no `EmailStr`) a propósito: un correo mal formado debe responder
    # 401 "Credenciales inválidas." (uniforme, sin enumeración de cuentas) en
    # lugar de un 422 de validación. El service normaliza y valida el dominio.
    email: str
    password: str


class SupabaseAccessTokenInput(BaseModel):
    access_token: str


class FrontendSessionExchangeInput(BaseModel):
    handoff_token: str


class FrontendSessionExchangeResponse(BaseModel):
    session_token: str
    token_type: str = "bearer"
    user: AuthUserResponse


class WebSessionTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MobileAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUserResponse
