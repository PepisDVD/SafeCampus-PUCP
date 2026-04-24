from __future__ import annotations

from typing import Any
from datetime import datetime

from pydantic import BaseModel, Field


class AdminUserItem(BaseModel):
    id: str
    email: str
    nombre: str
    apellido: str
    codigo_institucional: str | None = None
    departamento: str | None = None
    estado: str
    ultimo_acceso: datetime | None = None
    created_at: datetime
    updated_at: datetime
    roles: list[str] = Field(default_factory=list)


class AdminUsersListResponse(BaseModel):
    items: list[AdminUserItem]
    total: int


class AdminUserCreateRequest(BaseModel):
    email: str
    nombre: str = Field(min_length=2, max_length=100)
    apellido: str = Field(min_length=2, max_length=100)
    codigo_institucional: str | None = Field(default=None, max_length=20)
    departamento: str | None = Field(default=None, max_length=120)
    estado: str = Field(default="activo")
    role_ids: list[str] = Field(default_factory=list)


class AdminUserUpdateRequest(BaseModel):
    email: str | None = None
    nombre: str | None = Field(default=None, min_length=2, max_length=100)
    apellido: str | None = Field(default=None, min_length=2, max_length=100)
    codigo_institucional: str | None = Field(default=None, max_length=20)
    departamento: str | None = Field(default=None, max_length=120)
    estado: str | None = None
    role_ids: list[str] | None = None


class AdminRoleItem(BaseModel):
    id: str
    nombre: str
    descripcion: str | None = None
    es_sistema: bool
    permissions_count: int


class AdminRolesListResponse(BaseModel):
    items: list[AdminRoleItem]
    total: int


class AdminRoleCreateRequest(BaseModel):
    nombre: str = Field(min_length=2, max_length=50)
    descripcion: str | None = Field(default=None, max_length=500)


class AdminRoleUpdateRequest(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=50)
    descripcion: str | None = Field(default=None, max_length=500)


class AdminPermissionItem(BaseModel):
    id: str
    modulo: str
    accion: str
    descripcion: str | None = None


class AdminPermissionsListResponse(BaseModel):
    items: list[AdminPermissionItem]
    total: int


class RolePermissionItem(BaseModel):
    role_id: str
    permission_id: str


class RolePermissionsListResponse(BaseModel):
    items: list[RolePermissionItem]


class RolePermissionReplaceRequest(BaseModel):
    permission_ids: list[str] = Field(default_factory=list)


class AdminActionResponse(BaseModel):
    ok: bool = True
    message: str


class AdminIntegrationItem(BaseModel):
    id: str
    servicio: str
    nombre: str
    descripcion: str
    categoria: str
    estado: str
    ultima_verificacion: datetime | None = None
    latencia_ms: int | None = None
    mensaje_estado: str
    detalle: dict[str, Any] = Field(default_factory=dict)


class AdminIntegrationsListResponse(BaseModel):
    items: list[AdminIntegrationItem]
    total: int


class AdminIntegrationVerifyResponse(BaseModel):
    ok: bool = True
    message: str
    item: AdminIntegrationItem


class AdminAuditLogItem(BaseModel):
    id: str
    tipo: str
    actor: str
    accion: str
    detalle: str
    timestamp: datetime
    modulo: str
    entidad: str | None = None
    entidad_id: str | None = None
    ip_origen: str | None = None
    dispositivo: str | None = None


class AdminAuditLogsListResponse(BaseModel):
    items: list[AdminAuditLogItem]
    total: int
    limit: int
