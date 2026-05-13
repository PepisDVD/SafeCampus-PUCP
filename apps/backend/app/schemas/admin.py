"""
📁 apps/backend/app/schemas/admin.py
🎯 Esquemas Pydantic para el módulo de administración.
📦 Capa: Schemas
"""

from typing import Any

from pydantic import BaseModel, EmailStr


# ---------------------------------------------------------------------------
# Usuarios
# ---------------------------------------------------------------------------

class RolBrief(BaseModel):
    id: str
    nombre: str


class UsuarioOut(BaseModel):
    id: str
    nombre: str
    apellido: str
    email: str
    codigo_institucional: str | None
    departamento: str | None
    estado: str
    avatar_url: str | None
    ultimo_acceso: str | None
    created_at: str
    roles: list[RolBrief]


class UsuariosListResponse(BaseModel):
    items: list[UsuarioOut]
    total: int
    activos: int
    inactivos: int
    suspendidos: int


class UsuarioCreateInput(BaseModel):
    nombre: str
    apellido: str
    email: EmailStr
    codigo_institucional: str | None = None
    departamento: str | None = None
    rol_id: str


class UsuarioUpdateInput(BaseModel):
    nombre: str
    apellido: str
    codigo_institucional: str | None = None
    departamento: str | None = None
    rol_id: str


class CambiarEstadoInput(BaseModel):
    estado: str


# ---------------------------------------------------------------------------
# Roles & Permisos
# ---------------------------------------------------------------------------

class PermisoOut(BaseModel):
    id: str
    modulo: str
    accion: str
    descripcion: str | None


class RolConPermisosOut(BaseModel):
    id: str
    nombre: str
    descripcion: str | None
    es_sistema: bool
    permisos: list[PermisoOut]


class RolesListResponse(BaseModel):
    items: list[RolConPermisosOut]


class PermisosListResponse(BaseModel):
    items: list[PermisoOut]


class ActualizarPermisosInput(BaseModel):
    permiso_ids: list[str]


# ---------------------------------------------------------------------------
# Auditoría
# ---------------------------------------------------------------------------

class AuditoriaUsuarioOut(BaseModel):
    id: str
    nombre_completo: str
    email: EmailStr | None = None
    avatar_url: str | None = None


class RegistroAuditoriaOut(BaseModel):
    id: str
    usuario_id: str | None
    usuario: AuditoriaUsuarioOut | None = None
    modulo: str
    accion: str
    entidad: str | None
    entidad_id: str | None
    detalle: Any | None
    fecha_registro: str


class AuditoriaListResponse(BaseModel):
    items: list[RegistroAuditoriaOut]
    total: int


class ModulosResponse(BaseModel):
    modulos: list[str]


# ---------------------------------------------------------------------------
# Integraciones
# ---------------------------------------------------------------------------

class IntegracionOut(BaseModel):
    id: str
    servicio: str
    estado: str
    ultimo_check: str | None
    tiempo_respuesta_ms: int | None
    detalle: Any | None
    updated_at: str


class IntegracionesListResponse(BaseModel):
    items: list[IntegracionOut]
