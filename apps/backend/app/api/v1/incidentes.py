"""
📁 apps/backend/app/api/v1/incidentes.py
🎯 Endpoints REST del módulo de incidentes.
📦 Capa: API
"""

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_session, require_roles
from app.core.constants import EstadoIncidente, NivelSeveridad
from app.schemas.auth import AuthUserResponse
from app.schemas.incidente import (
    ComentarioIncidenteCreateInput,
    ComentarioIncidenteItem,
    DashboardStats,
    EvidenciaIncidenteItem,
    ExpedienteCierreAiDraft,
    IncidenteAsignacionUpdate,
    IncidenteCreated,
    IncidenteCreateInput,
    IncidenteDetail,
    IncidenteEstadoUpdate,
    IncidenteListResponse,
    IncidenteLiveLocationUpdate,
    IncidenteMapaResponse,
    KpisResponse,
    OperadorListItem,
)
from app.services.incidente_service import IncidenteService

router = APIRouter()

# Roles autorizados a ver/gestionar el listado operativo de incidentes.
OPERATIVO_ROLES = {"supervisor", "operador", "administrador"}


def get_service(db: AsyncSession = Depends(get_session)) -> IncidenteService:
    return IncidenteService(db)


@router.get("/", response_model=IncidenteListResponse)
async def listar_incidentes(
    search: str | None = Query(default=None, description="Filtra por código o título."),
    severidad: NivelSeveridad | None = Query(default=None),
    estado: EstadoIncidente | None = Query(default=None),
    mios: bool = Query(
        default=False,
        description="Si es true, solo devuelve incidentes asignados al usuario autenticado.",
    ),
    limit: int = Query(default=50, ge=1, le=200),
    current_user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: IncidenteService = Depends(get_service),
) -> IncidenteListResponse:
    """Listado operativo de incidentes — filtrable por búsqueda, severidad y estado.

    Con `mios=true` se restringe a los incidentes asignados al usuario autenticado
    (vista del operador en la app móvil). Restringido a roles
    supervisor / operador / administrador.
    """
    items = await service.listar_recentes(
        search=search,
        severidad=severidad.value if severidad else None,
        estado=estado.value if estado else None,
        asignado_a=current_user.id if mios else None,
        limit=limit,
    )
    return IncidenteListResponse(items=items, total=len(items))


@router.get("/mis", response_model=IncidenteListResponse)
async def listar_mis_incidentes(
    limit: int = Query(default=50, ge=1, le=100),
    current_user: AuthUserResponse = Depends(get_current_user),
    service: IncidenteService = Depends(get_service),
) -> IncidenteListResponse:
    """Listado de incidentes reportados por el usuario autenticado (PWA Comunidad)."""
    items = await service.listar_mis_incidentes(
        usuario_id=current_user.id,
        limit=limit,
    )
    return IncidenteListResponse(items=items, total=len(items))


@router.get("/mis/{incidente_ref}", response_model=IncidenteDetail)
async def obtener_mi_detalle_incidente(
    incidente_ref: str,
    current_user: AuthUserResponse = Depends(get_current_user),
    service: IncidenteService = Depends(get_service),
) -> IncidenteDetail:
    """Detalle de un incidente propio de comunidad, por codigo o UUID."""
    return await service.obtener_mi_detalle(
        incidente_ref=incidente_ref,
        usuario_id=current_user.id,
    )


@router.get("/kpis", response_model=KpisResponse)
async def obtener_kpis(
    period: str = Query(default="mes", pattern="^(semana|mes|trimestre|año)$"),
    _user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: IncidenteService = Depends(get_service),
) -> KpisResponse:
    """KPIs operativos con comparación contra el periodo anterior + breakdowns.

    Restringido a roles supervisor / operador / administrador.
    """
    return await service.obtener_kpis(period=period)


@router.get("/mapa", response_model=IncidenteMapaResponse)
async def listar_incidentes_mapa(
    severidad: NivelSeveridad | None = Query(default=None),
    estado: EstadoIncidente | None = Query(default=None),
    activos_only: bool = Query(default=True),
    limit: int = Query(default=300, ge=1, le=500),
    _user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: IncidenteService = Depends(get_service),
) -> IncidenteMapaResponse:
    """Incidentes para mapa tactico operativo con coordenadas cuando existan."""
    return await service.listar_mapa(
        severidad=severidad.value if severidad else None,
        estado=estado.value if estado else None,
        activos_only=activos_only,
        limit=limit,
    )


@router.get("/stats", response_model=DashboardStats)
async def obtener_stats(
    mios: bool = Query(
        default=False,
        description="Si es true, los counts se limitan a los incidentes asignados al usuario.",
    ),
    current_user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: IncidenteService = Depends(get_service),
) -> DashboardStats:
    """Métricas agregadas + top zonas para el dashboard operativo.

    Con `mios=true` los counts se limitan a los incidentes asignados al usuario
    autenticado (dashboard del operador en la app móvil). Restringido a roles
    supervisor / operador / administrador.
    """
    return await service.obtener_stats(
        asignado_a=current_user.id if mios else None,
    )


@router.get("/operadores", response_model=list[OperadorListItem])
async def listar_operadores(
    _user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: IncidenteService = Depends(get_service),
) -> list[OperadorListItem]:
    """Lista de operadores y supervisores activos para asignar a incidentes."""
    return await service.listar_operadores()


@router.get("/{incidente_id}", response_model=IncidenteDetail)
async def obtener_detalle_incidente(
    incidente_id: str,
    _user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: IncidenteService = Depends(get_service),
) -> IncidenteDetail:
    """Detalle completo de un incidente — incluye reportante, asignación e historial.

    Restringido a roles supervisor / operador / administrador.
    """
    return await service.obtener_detalle(incidente_id)


@router.patch("/{incidente_id}/estado", response_model=IncidenteDetail)
async def cambiar_estado_incidente(
    incidente_id: str,
    body: IncidenteEstadoUpdate,
    current_user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: IncidenteService = Depends(get_service),
) -> IncidenteDetail:
    """Cambia el estado del incidente, autopobla fechas SLA y registra historial."""
    return await service.cambiar_estado(
        incidente_id=incidente_id,
        ejecutor_id=current_user.id,
        data=body,
    )


@router.post(
    "/{incidente_id}/expediente-cierre/borrador-ia",
    response_model=ExpedienteCierreAiDraft,
)
async def generar_borrador_cierre_ia(
    incidente_id: str,
    current_user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: IncidenteService = Depends(get_service),
) -> ExpedienteCierreAiDraft:
    """Genera con Gemini un borrador editable para el expediente de cierre."""
    return await service.generar_borrador_cierre_ia(
        incidente_id=incidente_id,
        ejecutor_id=current_user.id,
    )


@router.patch("/{incidente_id}/asignar", response_model=IncidenteDetail)
async def asignar_operador_incidente(
    incidente_id: str,
    body: IncidenteAsignacionUpdate,
    current_user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: IncidenteService = Depends(get_service),
) -> IncidenteDetail:
    """Asigna operador, registra supervisor (quien ejecuta) e inserta historial."""
    return await service.asignar_operador(
        incidente_id=incidente_id,
        ejecutor_id=current_user.id,
        data=body,
    )


@router.post("/{incidente_id}/comentarios", response_model=ComentarioIncidenteItem)
async def crear_comentario_incidente(
    incidente_id: str,
    body: ComentarioIncidenteCreateInput,
    current_user: AuthUserResponse = Depends(get_current_user),
    service: IncidenteService = Depends(get_service),
) -> ComentarioIncidenteItem:
    """Agrega un mensaje al incidente y genera notificaciones internas."""
    return await service.crear_comentario(
        incidente_id=incidente_id,
        autor_id=current_user.id,
        roles=current_user.roles,
        data=body,
    )


@router.patch("/{incidente_id}/ubicacion-live", response_model=IncidenteDetail)
async def actualizar_ubicacion_en_vivo(
    incidente_id: str,
    body: IncidenteLiveLocationUpdate,
    current_user: AuthUserResponse = Depends(get_current_user),
    service: IncidenteService = Depends(get_service),
) -> IncidenteDetail:
    """Actualiza o detiene la ubicacion en vivo compartida por el reportante."""
    return await service.actualizar_ubicacion_en_vivo(
        incidente_id=incidente_id,
        reportante_id=current_user.id,
        data=body,
    )


@router.post("/{incidente_id}/ubicacion-live/stop", response_model=IncidenteDetail)
async def detener_ubicacion_en_vivo(
    incidente_id: str,
    current_user: AuthUserResponse = Depends(get_current_user),
    service: IncidenteService = Depends(get_service),
) -> IncidenteDetail:
    """Detiene la ubicacion en vivo de un incidente propio."""
    return await service.actualizar_ubicacion_en_vivo(
        incidente_id=incidente_id,
        reportante_id=current_user.id,
        data=IncidenteLiveLocationUpdate(activo=False),
    )


@router.post(
    "/{incidente_id}/evidencias",
    response_model=EvidenciaIncidenteItem,
    status_code=status.HTTP_201_CREATED,
)
async def subir_evidencia_incidente(
    incidente_id: str,
    archivo: UploadFile = File(
        ..., description="Imagen de evidencia (jpg, png, webp, heic, gif). Máx 10 MB."
    ),
    descripcion: str | None = Form(default=None, max_length=500),
    current_user: AuthUserResponse = Depends(get_current_user),
    service: IncidenteService = Depends(get_service),
) -> EvidenciaIncidenteItem:
    """Adjunta una imagen de evidencia a un incidente.

    Accesible por el reportante (comunidad) y por staff operativo.
    El archivo se almacena en Supabase Storage y la URL pública queda
    registrada en sc_incidentes.evidencia.
    """
    return await service.subir_evidencia(
        incidente_id=incidente_id,
        archivo=archivo,
        descripcion=descripcion,
        usuario_actual=current_user,
    )


@router.post(
    "/",
    response_model=IncidenteCreated,
    status_code=status.HTTP_201_CREATED,
)
async def crear_incidente(
    body: IncidenteCreateInput,
    current_user: AuthUserResponse = Depends(get_current_user),
    service: IncidenteService = Depends(get_service),
) -> IncidenteCreated:
    """Crea un nuevo incidente reportado por el usuario autenticado."""
    return await service.crear_incidente(
        reportante_id=current_user.id,
        data=body,
    )
