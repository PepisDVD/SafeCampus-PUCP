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
    roles: list[str]
