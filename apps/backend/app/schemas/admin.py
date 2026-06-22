"""
📁 apps/backend/app/schemas/admin.py
🎯 Esquemas Pydantic para el módulo de administración.
📦 Capa: Schemas
"""

from typing import Any

from pydantic import BaseModel, EmailStr, field_validator

# Dominios permitidos para registrar usuarios en el sistema.
ALLOWED_EMAIL_DOMAINS: tuple[str, ...] = ("gmail.com", "pucp.edu.pe")


def _validar_dominio_email(value: str) -> str:
    dominio = value.rsplit("@", 1)[-1].lower()
    if dominio not in ALLOWED_EMAIL_DOMAINS:
        permitidos = " o ".join(f"@{d}" for d in ALLOWED_EMAIL_DOMAINS)
        raise ValueError(
            f"El correo debe pertenecer a un dominio válido ({permitidos})."
        )
    return value.lower()


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
    telefono: str | None
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

    @field_validator("email")
    @classmethod
    def _email_dominio_permitido(cls, value: str) -> str:
        return _validar_dominio_email(value)


class UsuarioUpdateInput(BaseModel):
    nombre: str
    apellido: str
    codigo_institucional: str | None = None
    departamento: str | None = None
    rol_id: str


class UsuarioProfileUpdateInput(BaseModel):
    nombre: str
    apellido: str
    telefono: str | None = None
    departamento: str | None = None


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
    ip_origen: str | None = None
    dispositivo: str | None = None
    origen: str | None = None
    resultado: str | None = None
    fecha_registro: str


class AuditoriaListResponse(BaseModel):
    items: list[RegistroAuditoriaOut]
    page_size: int
    has_more: bool
    next_cursor: str | None = None


class ModulosResponse(BaseModel):
    modulos: list[str]


class AuditoriaAccionesResponse(BaseModel):
    acciones: list[str]


class AuditoriaUsuarioRef(BaseModel):
    id: str
    nombre_completo: str
    email: EmailStr | None = None


class AuditoriaUsuariosResponse(BaseModel):
    usuarios: list[AuditoriaUsuarioRef]


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


# ---------------------------------------------------------------------------
# LLM Audit
# ---------------------------------------------------------------------------

class LlmUsageItemOut(BaseModel):
    id: str
    conversacion_id: str
    incidente_id: str | None
    correlation_id: str
    provider: str
    model: str
    prompt_version: str | None
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    latency_ms: int | None
    fallback_applied: bool
    fallback_reason: str | None
    created_at: str


class LlmUsageListResponse(BaseModel):
    items: list[LlmUsageItemOut]
    total: int
    page: int
    page_size: int
    pages: int


class LlmUsageProviderStat(BaseModel):
    provider: str
    total_calls: int
    total_tokens: int
    prompt_tokens: int
    completion_tokens: int
    avg_latency_ms: float | None
    fallback_count: int


class LlmUsageStatsResponse(BaseModel):
    total_calls: int
    total_tokens: int
    prompt_tokens: int
    completion_tokens: int
    avg_latency_ms: float | None
    fallback_rate: float
    unique_conversations: int
    by_provider: list[LlmUsageProviderStat]
    tokens_per_day: list[dict[str, Any]]
