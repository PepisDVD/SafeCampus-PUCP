"""
📁 apps/backend/app/api/v1/admin.py
🎯 Endpoints del módulo de administración: usuarios, roles, auditoría, integraciones.
📦 Capa: API
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_session, require_roles
from app.schemas.admin import (
    ActualizarPermisosInput,
    AuditoriaAccionesResponse,
    AuditoriaListResponse,
    AuditoriaUsuariosResponse,
    CambiarEstadoInput,
    IntegracionesListResponse,
    LlmUsageListResponse,
    LlmUsageStatsResponse,
    ModulosResponse,
    PermisosListResponse,
    RolesListResponse,
    UsuarioCreateInput,
    UsuarioCreateResponse,
    UsuarioOut,
    UsuarioProfileUpdateInput,
    UsuariosListResponse,
    UsuarioUpdateInput,
)
from app.schemas.auth import AuthUserResponse
from app.schemas.common import MessageResponse
from app.services.admin_service import AdminService
from app.services.llm_audit_service import LlmAuditService

require_admin = require_roles({"administrador"})
router = APIRouter(dependencies=[Depends(require_admin)])


def _split_csv(value: str | None) -> list[str] | None:
    if not value:
        return None
    items = [item.strip() for item in value.split(",") if item.strip()]
    return items or None


def get_service(db: AsyncSession = Depends(get_session)) -> AdminService:
    return AdminService(db)


# ---------------------------------------------------------------------------
# Usuarios
# ---------------------------------------------------------------------------


@router.get("/usuarios", response_model=UsuariosListResponse, tags=["Admin - Usuarios"])
async def listar_usuarios(
    search: str | None = Query(default=None),
    estado: str | None = Query(default=None),
    service: AdminService = Depends(get_service),
) -> UsuariosListResponse:
    return await service.listar_usuarios(search=search, estado=estado)


@router.post(
    "/usuarios",
    response_model=UsuarioCreateResponse,
    status_code=201,
    tags=["Admin - Usuarios"],
)
async def crear_usuario(
    body: UsuarioCreateInput,
    service: AdminService = Depends(get_service),
    current_user: AuthUserResponse = Depends(require_admin),
) -> UsuarioCreateResponse:
    return await service.crear_usuario(body, actor_id=current_user.id)


@router.put("/usuarios/{usuario_id}", response_model=UsuarioOut, tags=["Admin - Usuarios"])
async def actualizar_usuario(
    usuario_id: str,
    body: UsuarioUpdateInput,
    service: AdminService = Depends(get_service),
    current_user: AuthUserResponse = Depends(require_admin),
) -> UsuarioOut:
    return await service.actualizar_usuario(usuario_id, body, actor_id=current_user.id)


@router.patch(
    "/usuarios/{usuario_id}/perfil",
    response_model=UsuarioOut,
    tags=["Admin - Usuarios"],
)
async def actualizar_perfil_usuario(
    usuario_id: str,
    body: UsuarioProfileUpdateInput,
    service: AdminService = Depends(get_service),
    current_user: AuthUserResponse = Depends(require_admin),
) -> UsuarioOut:
    return await service.actualizar_perfil_usuario(usuario_id, body, actor_id=current_user.id)


@router.patch(
    "/usuarios/{usuario_id}/estado",
    response_model=MessageResponse,
    tags=["Admin - Usuarios"],
)
async def cambiar_estado_usuario(
    usuario_id: str,
    body: CambiarEstadoInput,
    service: AdminService = Depends(get_service),
    current_user: AuthUserResponse = Depends(require_admin),
) -> MessageResponse:
    result = await service.cambiar_estado(usuario_id, body, actor_id=current_user.id)
    return MessageResponse(message=result["message"])


# ---------------------------------------------------------------------------
# Roles & Permisos
# ---------------------------------------------------------------------------


@router.get("/roles", response_model=RolesListResponse, tags=["Admin - Roles"])
async def listar_roles(service: AdminService = Depends(get_service)) -> RolesListResponse:
    return await service.listar_roles()


@router.get("/roles/permisos", response_model=PermisosListResponse, tags=["Admin - Roles"])
async def listar_permisos(service: AdminService = Depends(get_service)) -> PermisosListResponse:
    return await service.listar_permisos()


@router.put(
    "/roles/{rol_id}/permisos",
    response_model=MessageResponse,
    tags=["Admin - Roles"],
)
async def actualizar_permisos_rol(
    rol_id: str,
    body: ActualizarPermisosInput,
    service: AdminService = Depends(get_service),
    current_user: AuthUserResponse = Depends(require_admin),
) -> MessageResponse:
    result = await service.actualizar_permisos_rol(rol_id, body, actor_id=current_user.id)
    return MessageResponse(message=result["message"])


# ---------------------------------------------------------------------------
# Auditoría
# ---------------------------------------------------------------------------


@router.get("/auditoria", response_model=AuditoriaListResponse, tags=["Admin - Auditoría"])
async def listar_auditoria(
    search: str | None = Query(default=None),
    modulo: str | None = Query(default=None, description="CSV de módulos"),
    accion: str | None = Query(default=None, description="CSV de acciones"),
    usuario_id: str | None = Query(default=None),
    entidad: str | None = Query(default=None),
    resultado: str | None = Query(default=None, description="CSV de resultados"),
    desde: str | None = Query(default=None),
    hasta: str | None = Query(default=None),
    cursor: str | None = Query(default=None),
    page_size: int = Query(default=25, ge=1, le=100),
    service: AdminService = Depends(get_service),
) -> AuditoriaListResponse:
    return await service.listar_auditoria(
        search=search,
        modulos=_split_csv(modulo),
        acciones=_split_csv(accion),
        usuario_id=usuario_id,
        entidad=entidad,
        resultados=_split_csv(resultado),
        desde=desde,
        hasta=hasta,
        cursor=cursor,
        page_size=page_size,
    )


@router.get(
    "/auditoria/modulos",
    response_model=ModulosResponse,
    tags=["Admin - Auditoría"],
)
async def obtener_modulos(service: AdminService = Depends(get_service)) -> ModulosResponse:
    return await service.obtener_modulos_distintos()


@router.get(
    "/auditoria/acciones",
    response_model=AuditoriaAccionesResponse,
    tags=["Admin - Auditoría"],
)
async def obtener_acciones(
    service: AdminService = Depends(get_service),
) -> AuditoriaAccionesResponse:
    return await service.obtener_acciones_distintas()


@router.get(
    "/auditoria/usuarios",
    response_model=AuditoriaUsuariosResponse,
    tags=["Admin - Auditoría"],
)
async def obtener_usuarios_auditoria(
    service: AdminService = Depends(get_service),
) -> AuditoriaUsuariosResponse:
    return await service.obtener_usuarios_auditoria()


# ---------------------------------------------------------------------------
# Integraciones
# ---------------------------------------------------------------------------


@router.get(
    "/integraciones",
    response_model=IntegracionesListResponse,
    tags=["Admin - Integraciones"],
)
async def listar_integraciones(
    service: AdminService = Depends(get_service),
) -> IntegracionesListResponse:
    return await service.listar_integraciones()


@router.post(
    "/integraciones/{integracion_id}/verificar",
    response_model=MessageResponse,
    tags=["Admin - Integraciones"],
)
async def verificar_integracion(
    integracion_id: str,
    service: AdminService = Depends(get_service),
) -> MessageResponse:
    result = await service.verificar_integracion(integracion_id)
    return MessageResponse(message=result["message"])


# ---------------------------------------------------------------------------
# LLM Audit
# ---------------------------------------------------------------------------


def get_llm_audit_service(db: AsyncSession = Depends(get_session)) -> LlmAuditService:
    return LlmAuditService(db)


@router.get(
    "/llm-audit",
    response_model=LlmUsageListResponse,
    tags=["Admin - LLM Audit"],
)
async def listar_llm_usage(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=5, le=100),
    conversacion_id: str | None = Query(default=None),
    provider: str | None = Query(default=None),
    desde: str | None = Query(default=None),
    hasta: str | None = Query(default=None),
    service: LlmAuditService = Depends(get_llm_audit_service),
) -> LlmUsageListResponse:
    return await service.listar_uso(
        page=page,
        page_size=page_size,
        conversacion_id=conversacion_id,
        providers=[item.strip() for item in provider.split(",") if item.strip()]
        if provider
        else None,
        desde=desde,
        hasta=hasta,
    )


@router.get(
    "/llm-audit/stats",
    response_model=LlmUsageStatsResponse,
    tags=["Admin - LLM Audit"],
)
async def obtener_llm_stats(
    desde: str | None = Query(default=None),
    hasta: str | None = Query(default=None),
    service: LlmAuditService = Depends(get_llm_audit_service),
) -> LlmUsageStatsResponse:
    return await service.obtener_stats(desde=desde, hasta=hasta)


@router.get(
    "/llm-audit/providers",
    response_model=list[str],
    tags=["Admin - LLM Audit"],
)
async def listar_providers(
    service: LlmAuditService = Depends(get_llm_audit_service),
) -> list[str]:
    return await service.listar_providers()
