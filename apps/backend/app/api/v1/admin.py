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
    AuditoriaListResponse,
    CambiarEstadoInput,
    IntegracionesListResponse,
    LlmUsageListResponse,
    LlmUsageStatsResponse,
    ModulosResponse,
    PermisosListResponse,
    RolesListResponse,
    UsuarioCreateInput,
    UsuarioOut,
    UsuarioUpdateInput,
    UsuariosListResponse,
)
from app.schemas.common import MessageResponse
from app.services.admin_service import AdminService
from app.services.llm_audit_service import LlmAuditService

router = APIRouter(dependencies=[Depends(require_roles({"administrador"}))])


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
):
    return await service.listar_usuarios(search=search, estado=estado)


@router.post("/usuarios", response_model=UsuarioOut, status_code=201, tags=["Admin - Usuarios"])
async def crear_usuario(
    body: UsuarioCreateInput,
    service: AdminService = Depends(get_service),
):
    return await service.crear_usuario(body)


@router.put("/usuarios/{usuario_id}", response_model=UsuarioOut, tags=["Admin - Usuarios"])
async def actualizar_usuario(
    usuario_id: str,
    body: UsuarioUpdateInput,
    service: AdminService = Depends(get_service),
):
    return await service.actualizar_usuario(usuario_id, body)


@router.patch(
    "/usuarios/{usuario_id}/estado",
    response_model=MessageResponse,
    tags=["Admin - Usuarios"],
)
async def cambiar_estado_usuario(
    usuario_id: str,
    body: CambiarEstadoInput,
    service: AdminService = Depends(get_service),
):
    result = await service.cambiar_estado(usuario_id, body)
    return MessageResponse(message=result["message"])


# ---------------------------------------------------------------------------
# Roles & Permisos
# ---------------------------------------------------------------------------

@router.get("/roles", response_model=RolesListResponse, tags=["Admin - Roles"])
async def listar_roles(service: AdminService = Depends(get_service)):
    return await service.listar_roles()


@router.get("/roles/permisos", response_model=PermisosListResponse, tags=["Admin - Roles"])
async def listar_permisos(service: AdminService = Depends(get_service)):
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
):
    result = await service.actualizar_permisos_rol(rol_id, body)
    return MessageResponse(message=result["message"])


# ---------------------------------------------------------------------------
# Auditoría
# ---------------------------------------------------------------------------

@router.get("/auditoria", response_model=AuditoriaListResponse, tags=["Admin - Auditoría"])
async def listar_auditoria(
    search: str | None = Query(default=None),
    modulo: str | None = Query(default=None),
    usuario_id: str | None = Query(default=None),
    desde: str | None = Query(default=None),
    hasta: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    service: AdminService = Depends(get_service),
):
    return await service.listar_auditoria(
        search=search,
        modulo=modulo,
        usuario_id=usuario_id,
        desde=desde,
        hasta=hasta,
        limit=limit,
    )


@router.get(
    "/auditoria/modulos",
    response_model=ModulosResponse,
    tags=["Admin - Auditoría"],
)
async def obtener_modulos(service: AdminService = Depends(get_service)):
    return await service.obtener_modulos_distintos()


# ---------------------------------------------------------------------------
# Integraciones
# ---------------------------------------------------------------------------

@router.get(
    "/integraciones",
    response_model=IntegracionesListResponse,
    tags=["Admin - Integraciones"],
)
async def listar_integraciones(service: AdminService = Depends(get_service)):
    return await service.listar_integraciones()


@router.post(
    "/integraciones/{integracion_id}/verificar",
    response_model=MessageResponse,
    tags=["Admin - Integraciones"],
)
async def verificar_integracion(
    integracion_id: str,
    service: AdminService = Depends(get_service),
):
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
):
    return await service.listar_uso(
        page=page,
        page_size=page_size,
        conversacion_id=conversacion_id,
        provider=provider,
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
):
    return await service.obtener_stats(desde=desde, hasta=hasta)


@router.get(
    "/llm-audit/providers",
    response_model=list[str],
    tags=["Admin - LLM Audit"],
)
async def listar_providers(
    service: LlmAuditService = Depends(get_llm_audit_service),
):
    return await service.listar_providers()
