from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_session, require_roles
from app.core.constants import EstadoCasoLF, EstadoCustodia, TipoCasoLF
from app.schemas.auth import AuthUserResponse
from app.schemas.lost_found import (
    CancelarCasoLfInput,
    CasoLfCreateInput,
    CasoLfCreated,
    CasoLfDetail,
    CasoLfEstadoUpdate,
    CasoLfFotosInput,
    CasoLfListResponse,
    CategoriaLfCreate,
    CategoriaLfItem,
    ComentarioLfCreateInput,
    ComentarioLfItem,
    ComentarioVisibilidadInput,
    ConfiguracionLfItem,
    ConfiguracionLfUpdateInput,
    CustodiaLfCreateInput,
    CustodiaLfItem,
    CustodiaLfListResponse,
    CustodiaLfUpdateInput,
    DescarteLfInput,
    DevolucionLfInput,
    KpisLfResponse,
    MatchLfItem,
    MatchLfResponderInput,
    ParticipacionLfInput,
)
from app.services.lost_found_service import LostFoundService

router = APIRouter()
OPERATIVO_ROLES = {"supervisor", "administrador"}
ADMIN_ROLES = {"administrador"}


def get_service(db: AsyncSession = Depends(get_session)) -> LostFoundService:
    return LostFoundService(db)


@router.get("/categorias", response_model=list[CategoriaLfItem])
async def listar_categorias(
    include_inactive: bool = Query(default=False),
    service: LostFoundService = Depends(get_service),
):
    return await service.listar_categorias(include_inactive=include_inactive)


@router.post("/categorias", response_model=CategoriaLfItem, status_code=status.HTTP_201_CREATED)
async def crear_categoria(
    body: CategoriaLfCreate,
    current_user: AuthUserResponse = Depends(require_roles(ADMIN_ROLES)),
    service: LostFoundService = Depends(get_service),
):
    return await service.crear_categoria(body, current_user.id)


@router.patch("/categorias/{categoria_id}", response_model=CategoriaLfItem)
async def actualizar_categoria(
    categoria_id: str,
    body: CategoriaLfCreate,
    current_user: AuthUserResponse = Depends(require_roles(ADMIN_ROLES)),
    service: LostFoundService = Depends(get_service),
):
    return await service.actualizar_categoria(categoria_id, body, current_user.id)


@router.post("/casos", response_model=CasoLfCreated, status_code=status.HTTP_201_CREATED)
async def crear_caso(
    body: CasoLfCreateInput,
    current_user: AuthUserResponse = Depends(get_current_user),
    service: LostFoundService = Depends(get_service),
):
    return await service.crear_caso(current_user.id, body)


@router.get("/casos/feed", response_model=CasoLfListResponse)
async def listar_feed(
    search: str | None = Query(default=None),
    tipo: TipoCasoLF | None = Query(default=None),
    estado: EstadoCasoLF | None = Query(default=None),
    categoria_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    service: LostFoundService = Depends(get_service),
):
    items = await service.listar_feed(
        search=search,
        tipo=tipo.value if tipo else None,
        estado=estado.value if estado else None,
        categoria_id=categoria_id,
        limit=limit,
    )
    return CasoLfListResponse(items=items, total=len(items))


@router.get("/casos/mis", response_model=CasoLfListResponse)
async def listar_mis_casos(
    limit: int = Query(default=50, ge=1, le=100),
    current_user: AuthUserResponse = Depends(get_current_user),
    service: LostFoundService = Depends(get_service),
):
    items = await service.listar_mis_casos(current_user.id, limit)
    return CasoLfListResponse(items=items, total=len(items))


@router.get("/casos", response_model=CasoLfListResponse)
async def listar_casos_operativo(
    search: str | None = Query(default=None),
    tipo: TipoCasoLF | None = Query(default=None),
    estado: EstadoCasoLF | None = Query(default=None),
    categoria_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    _user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: LostFoundService = Depends(get_service),
):
    items = await service.listar_operativo(
        search=search,
        tipo=tipo.value if tipo else None,
        estado=estado.value if estado else None,
        categoria_id=categoria_id,
        limit=limit,
    )
    return CasoLfListResponse(items=items, total=len(items))


@router.get("/casos/{ref}", response_model=CasoLfDetail)
async def obtener_caso(
    ref: str,
    current_user: AuthUserResponse = Depends(get_current_user),
    service: LostFoundService = Depends(get_service),
):
    return await service.obtener_detalle(ref, current_user.id, current_user.roles)


@router.patch("/casos/{caso_id}/estado", response_model=CasoLfDetail)
async def cambiar_estado(
    caso_id: str,
    body: CasoLfEstadoUpdate,
    current_user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: LostFoundService = Depends(get_service),
):
    return await service.cambiar_estado(caso_id, current_user.id, body)


@router.patch("/casos/{caso_id}/cancelar", response_model=CasoLfDetail)
async def cancelar_caso(
    caso_id: str,
    body: CancelarCasoLfInput,
    current_user: AuthUserResponse = Depends(get_current_user),
    service: LostFoundService = Depends(get_service),
):
    return await service.cancelar_caso(caso_id, current_user.id, body)


@router.post("/casos/{caso_id}/fotos", response_model=CasoLfDetail)
async def actualizar_fotos(
    caso_id: str,
    body: CasoLfFotosInput,
    current_user: AuthUserResponse = Depends(get_current_user),
    service: LostFoundService = Depends(get_service),
):
    return await service.actualizar_fotos(caso_id, current_user.id, current_user.roles, body)


@router.post("/casos/{caso_id}/fotos/upload", response_model=CasoLfDetail)
async def subir_fotos_archivo(
    caso_id: str,
    archivos: list[UploadFile] = File(..., description="Hasta 3 imagenes (jpg, png, webp, heic, gif). Max. 10MB por archivo."),
    current_user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: LostFoundService = Depends(get_service),
):
    return await service.subir_fotos_archivos(caso_id, current_user.id, current_user.roles, archivos)


@router.get("/casos/{caso_id}/matches", response_model=list[MatchLfItem])
async def listar_matches(
    _caso_id: str,
    current_user: AuthUserResponse = Depends(get_current_user),
    service: LostFoundService = Depends(get_service),
):
    return await service.listar_matches(current_user.id)


@router.post("/matches/{match_id}/responder", status_code=status.HTTP_204_NO_CONTENT)
async def responder_match(
    match_id: str,
    body: MatchLfResponderInput,
    current_user: AuthUserResponse = Depends(get_current_user),
    service: LostFoundService = Depends(get_service),
):
    await service.responder_match(match_id, current_user.id, body)


@router.get("/casos/{caso_id}/comentarios", response_model=list[ComentarioLfItem])
async def listar_comentarios(
    caso_id: str,
    current_user: AuthUserResponse = Depends(get_current_user),
    service: LostFoundService = Depends(get_service),
):
    return await service.listar_comentarios(caso_id, current_user.roles)


@router.post("/casos/{caso_id}/comentarios", response_model=ComentarioLfItem, status_code=status.HTTP_201_CREATED)
async def crear_comentario(
    caso_id: str,
    body: ComentarioLfCreateInput,
    current_user: AuthUserResponse = Depends(get_current_user),
    service: LostFoundService = Depends(get_service),
):
    return await service.crear_comentario(caso_id, current_user.id, body)


@router.patch("/casos/{caso_id}/participacion", status_code=status.HTTP_204_NO_CONTENT)
async def actualizar_participacion(
    caso_id: str,
    body: ParticipacionLfInput,
    current_user: AuthUserResponse = Depends(get_current_user),
    service: LostFoundService = Depends(get_service),
):
    await service.actualizar_participacion(caso_id, current_user.id, body)


@router.post("/casos/{caso_id}/custodia", response_model=CustodiaLfItem, status_code=status.HTTP_201_CREATED)
async def crear_custodia(
    caso_id: str,
    body: CustodiaLfCreateInput,
    current_user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: LostFoundService = Depends(get_service),
):
    return await service.crear_custodia(caso_id, current_user.id, body)


@router.get("/custodias", response_model=CustodiaLfListResponse)
async def listar_custodias(
    estado: EstadoCustodia | None = Query(default=None),
    search: str | None = Query(default=None),
    vencimiento: str | None = Query(default=None, pattern="^(vigente|proxima|vencida)$"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    _user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: LostFoundService = Depends(get_service),
):
    return await service.listar_custodias(
        estado=estado.value if estado else None,
        search=search,
        vencimiento=vencimiento,
        page=page,
        per_page=per_page,
    )


@router.patch("/custodias/{custodia_id}", response_model=CustodiaLfItem)
async def actualizar_custodia(
    custodia_id: str,
    body: CustodiaLfUpdateInput,
    _user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: LostFoundService = Depends(get_service),
):
    return await service.actualizar_custodia(custodia_id, body)


@router.post("/custodias/{custodia_id}/devolucion", status_code=status.HTTP_204_NO_CONTENT)
async def registrar_devolucion(
    custodia_id: str,
    body: DevolucionLfInput,
    current_user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: LostFoundService = Depends(get_service),
):
    await service.registrar_devolucion(custodia_id, current_user.id, body)


@router.post("/custodias/{custodia_id}/descarte", status_code=status.HTTP_204_NO_CONTENT)
async def registrar_descarte(
    custodia_id: str,
    body: DescarteLfInput,
    current_user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: LostFoundService = Depends(get_service),
):
    await service.registrar_descarte(custodia_id, current_user.id, body)


@router.patch("/comentarios/{comentario_id}/visibilidad", status_code=status.HTTP_204_NO_CONTENT)
async def moderar_comentario(
    comentario_id: str,
    body: ComentarioVisibilidadInput,
    current_user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: LostFoundService = Depends(get_service),
):
    await service.moderar_comentario(comentario_id, current_user.id, body)


@router.get("/kpis", response_model=KpisLfResponse)
async def obtener_kpis(
    _user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: LostFoundService = Depends(get_service),
):
    return await service.obtener_kpis()


@router.get("/configuracion", response_model=list[ConfiguracionLfItem])
async def listar_configuracion(
    _user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: LostFoundService = Depends(get_service),
):
    return await service.listar_configuracion()


@router.patch("/configuracion/{key}", response_model=ConfiguracionLfItem)
async def actualizar_configuracion(
    key: str,
    body: ConfiguracionLfUpdateInput,
    current_user: AuthUserResponse = Depends(require_roles(ADMIN_ROLES)),
    service: LostFoundService = Depends(get_service),
):
    return await service.actualizar_configuracion(key, current_user.id, body)
