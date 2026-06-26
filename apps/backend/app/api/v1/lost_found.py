import json
from datetime import date, datetime, time, timedelta, timezone
from enum import Enum
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_session, require_roles
from app.core.constants import EstadoCasoLF, EstadoCustodia, TipoCasoLF
from app.schemas.auth import AuthUserResponse
from app.schemas.lost_found import (
    AccesoLfMiResult,
    AccesoLfUpdateInput,
    CancelarCasoLfInput,
    CasoLfCreated,
    CasoLfCreateInput,
    CasoLfDetail,
    CasoLfEstadoUpdate,
    CasoCierreInput,
    CasoLfFotosInput,
    CasoLfListResponse,
    CasoLfUpdateInput,
    CasoVisibilidadInput,
    CategoriaLfCreate,
    CategoriaLfItem,
    ComentarioFijarInput,
    ComentarioLfCreateInput,
    ComentarioLfEditInput,
    ComentarioLfItem,
    ComentarioReaccionResult,
    ComentarioVisibilidadInput,
    ConfiguracionLfItem,
    ConfiguracionLfUpdateInput,
    CustodiaLfCreateInput,
    CustodiaLfItem,
    CustodiaLfListResponse,
    CustodiaLfUpdateInput,
    CustodiaPoliticaItem,
    CustodiaPoliticaUpdateInput,
    DescarteLfInput,
    DevolucionLfInput,
    DashboardLfResponse,
    KpisLfResponse,
    MatchingConfigItem,
    MatchingConfigUpdateInput,
    MatchLfItem,
    MatchLfResponderInput,
    MotivoCierreLfCreate,
    MotivoCierreLfItem,
    ParticipacionLfInput,
    SupervisorLfItem,
)
from app.services.lost_found_service import LostFoundService

router = APIRouter()
OPERATIVO_ROLES = {"supervisor", "operador", "administrador"}
ADMIN_ROLES = {"administrador"}


def _parse_enum_csv(value: str | None, enum_type: type[Enum]) -> list[str] | None:
    if not value:
        return None
    try:
        parsed = [enum_type(item.strip()).value for item in value.split(",") if item.strip()]
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Filtro inválido: {exc}") from exc
    return [str(item) for item in parsed] or None


def _parse_uuid_csv(value: str | None) -> list[str] | None:
    if not value:
        return None
    try:
        return [str(UUID(item.strip())) for item in value.split(",") if item.strip()] or None
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail="Una categoría seleccionada no es válida.",
        ) from exc


def _parse_choice_csv(value: str | None, allowed: set[str]) -> list[str] | None:
    if not value:
        return None
    parsed = [item.strip() for item in value.split(",") if item.strip()]
    if any(item not in allowed for item in parsed):
        raise HTTPException(status_code=422, detail="Filtro de vencimiento inválido.")
    return parsed or None


def get_service(db: AsyncSession = Depends(get_session)) -> LostFoundService:
    return LostFoundService(db)


async def require_lost_found_access(
    current_user: AuthUserResponse = Depends(get_current_user),
    service: LostFoundService = Depends(get_service),
) -> AuthUserResponse:
    """Exige rol operativo + acceso al módulo (administrador siempre pasa)."""
    if not OPERATIVO_ROLES.intersection(current_user.roles):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos sobre el módulo.")
    if not await service.tiene_acceso_lf(current_user.id, current_user.roles):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes acceso al módulo Lost & Found.")
    return current_user


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


@router.get("/motivos-cierre", response_model=list[MotivoCierreLfItem])
async def listar_motivos_cierre(
    include_inactive: bool = Query(default=False),
    _user: AuthUserResponse = Depends(require_roles(ADMIN_ROLES)),
    service: LostFoundService = Depends(get_service),
):
    return await service.listar_motivos_cierre(include_inactive)


@router.post("/motivos-cierre", response_model=MotivoCierreLfItem, status_code=status.HTTP_201_CREATED)
async def crear_motivo_cierre(
    body: MotivoCierreLfCreate,
    current_user: AuthUserResponse = Depends(require_roles(ADMIN_ROLES)),
    service: LostFoundService = Depends(get_service),
):
    return await service.crear_motivo_cierre(body, current_user.id)


@router.patch("/motivos-cierre/{motivo_id}", response_model=MotivoCierreLfItem)
async def actualizar_motivo_cierre(
    motivo_id: str,
    body: MotivoCierreLfCreate,
    current_user: AuthUserResponse = Depends(require_roles(ADMIN_ROLES)),
    service: LostFoundService = Depends(get_service),
):
    return await service.actualizar_motivo_cierre(motivo_id, body, current_user.id)


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
    lugar: str | None = Query(default=None),
    fecha_desde: datetime | None = Query(default=None),
    fecha_hasta: datetime | None = Query(default=None),
    color: str | None = Query(default=None),
    publicado_desde: datetime | None = Query(default=None),
    lat: float | None = Query(default=None, ge=-90, le=90),
    lng: float | None = Query(default=None, ge=-180, le=180),
    radio_km: float | None = Query(default=None, gt=0, le=10),
    metadatos: str | None = Query(default=None, description="Filtros de metadatos como objeto JSON."),
    cursor: datetime | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    service: LostFoundService = Depends(get_service),
):
    page_limit = max(1, min(limit, 100))
    geo_args = [lat, lng, radio_km]
    if any(arg is not None for arg in geo_args) and any(arg is None for arg in geo_args):
        raise HTTPException(status_code=422, detail="El filtro por ubicación requiere lat, lng y radio_km.")
    metadatos_filtro: dict | None = None
    if metadatos:
        try:
            parsed = json.loads(metadatos)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=422, detail="El filtro de metadatos no es un JSON válido.") from exc
        if not isinstance(parsed, dict):
            raise HTTPException(status_code=422, detail="El filtro de metadatos debe ser un objeto.")
        metadatos_filtro = {str(k): v for k, v in parsed.items() if v not in (None, "")}
        metadatos_filtro = metadatos_filtro or None
    items = await service.listar_feed(
        search=search,
        tipo=tipo.value if tipo else None,
        estado=estado.value if estado else None,
        categoria_id=categoria_id,
        lugar=lugar,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        color=color,
        publicado_desde=publicado_desde,
        lat=lat,
        lng=lng,
        radio_km=radio_km,
        metadatos=metadatos_filtro,
        cursor=cursor,
        limit=min(page_limit + 1, 100),
    )
    next_cursor = items[page_limit - 1].created_at if len(items) > page_limit else None
    return CasoLfListResponse(items=items[:page_limit], total=len(items[:page_limit]), next_cursor=next_cursor)


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
    tipo: str | None = Query(default=None),
    estado: str | None = Query(default=None),
    categoria_id: str | None = Query(default=None),
    cursor: datetime | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    _user: AuthUserResponse = Depends(require_lost_found_access),
    service: LostFoundService = Depends(get_service),
):
    page_limit = max(1, min(limit, 200))
    items = await service.listar_operativo(
        search=search,
        tipos=_parse_enum_csv(tipo, TipoCasoLF),
        estados=_parse_enum_csv(estado, EstadoCasoLF),
        categoria_ids=_parse_uuid_csv(categoria_id),
        cursor=cursor,
        limit=min(page_limit + 1, 200),
    )
    next_cursor = items[page_limit - 1].created_at if len(items) > page_limit else None
    return CasoLfListResponse(items=items[:page_limit], total=len(items[:page_limit]), next_cursor=next_cursor)


@router.get("/casos/{ref}", response_model=CasoLfDetail)
async def obtener_caso(
    ref: str,
    current_user: AuthUserResponse = Depends(get_current_user),
    service: LostFoundService = Depends(get_service),
):
    return await service.obtener_detalle(ref, current_user.id, current_user.roles)


@router.patch("/casos/{caso_id}", response_model=CasoLfDetail)
async def actualizar_caso(
    caso_id: str,
    body: CasoLfUpdateInput,
    current_user: AuthUserResponse = Depends(get_current_user),
    service: LostFoundService = Depends(get_service),
):
    """Edita los datos descriptivos del hilo. Solo el dueño o un administrador."""
    return await service.actualizar_caso(caso_id, current_user.id, current_user.roles, body)


@router.patch("/casos/{caso_id}/cierre", response_model=CasoLfDetail)
async def cerrar_reabrir_caso(
    caso_id: str,
    body: CasoCierreInput,
    current_user: AuthUserResponse = Depends(require_roles(ADMIN_ROLES)),
    service: LostFoundService = Depends(get_service),
):
    """Cierra o reabre un hilo (habilita/deshabilita la interacción). Solo administrador."""
    return await service.cerrar_reabrir_caso(caso_id, current_user.id, body)


@router.patch("/casos/{caso_id}/visibilidad", response_model=CasoLfDetail)
async def ocultar_mostrar_caso(
    caso_id: str,
    body: CasoVisibilidadInput,
    current_user: AuthUserResponse = Depends(require_roles(ADMIN_ROLES)),
    service: LostFoundService = Depends(get_service),
):
    """Oculta o muestra un hilo para la comunidad. Solo administrador."""
    return await service.ocultar_mostrar_caso(caso_id, current_user.id, body)


@router.patch("/casos/{caso_id}/estado", response_model=CasoLfDetail)
async def cambiar_estado(
    caso_id: str,
    body: CasoLfEstadoUpdate,
    current_user: AuthUserResponse = Depends(require_lost_found_access),
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
    current_user: AuthUserResponse = Depends(get_current_user),
    service: LostFoundService = Depends(get_service),
):
    return await service.subir_fotos_archivos(caso_id, current_user.id, current_user.roles, archivos)


@router.get("/casos/{caso_id}/matches", response_model=list[MatchLfItem])
async def listar_matches(
    caso_id: str,
    current_user: AuthUserResponse = Depends(get_current_user),
    service: LostFoundService = Depends(get_service),
):
    return await service.listar_matches(caso_id, current_user.id, current_user.roles)


@router.post("/matches/{match_id}/responder", status_code=status.HTTP_204_NO_CONTENT)
async def responder_match(
    match_id: str,
    body: MatchLfResponderInput,
    current_user: AuthUserResponse = Depends(get_current_user),
    service: LostFoundService = Depends(get_service),
):
    await service.responder_match(match_id, current_user.id, current_user.roles, body)


@router.get("/casos/{caso_id}/comentarios", response_model=list[ComentarioLfItem])
async def listar_comentarios(
    caso_id: str,
    current_user: AuthUserResponse = Depends(get_current_user),
    service: LostFoundService = Depends(get_service),
):
    return await service.listar_comentarios(caso_id, current_user.roles, current_user.id)


@router.post("/casos/{caso_id}/comentarios", response_model=ComentarioLfItem, status_code=status.HTTP_201_CREATED)
async def crear_comentario(
    caso_id: str,
    contenido: str = Form(..., min_length=2, max_length=2000),
    parent_id: str | None = Form(default=None),
    tag: str | None = Form(default=None),
    archivos: list[UploadFile] = File(default=[], description="Hasta 3 imagenes (jpg, png, webp, heic, gif). Max. 10MB por archivo."),
    current_user: AuthUserResponse = Depends(get_current_user),
    service: LostFoundService = Depends(get_service),
):
    body = ComentarioLfCreateInput(contenido=contenido, parent_id=parent_id or None, tag=tag or None)
    # FastAPI entrega un UploadFile vacío cuando no se adjunta nada; lo filtramos.
    imagenes = [a for a in archivos if a and a.filename]
    return await service.crear_comentario(caso_id, current_user.id, body, imagenes)


@router.post("/casos/{caso_id}/media", response_model=list[str])
async def subir_media_caso(
    caso_id: str,
    archivos: list[UploadFile] = File(..., description="Hasta 3 imagenes (jpg, png, webp, heic, gif). Max. 10MB por archivo."),
    current_user: AuthUserResponse = Depends(get_current_user),
    service: LostFoundService = Depends(get_service),
):
    """Sube imágenes y devuelve sus URLs sin mutar el caso (para la edición del hilo)."""
    return await service.subir_media_caso(caso_id, current_user.id, current_user.roles, archivos)


@router.patch("/comentarios/{comentario_id}", status_code=status.HTTP_204_NO_CONTENT)
async def editar_comentario(
    comentario_id: str,
    body: ComentarioLfEditInput,
    current_user: AuthUserResponse = Depends(require_lost_found_access),
    service: LostFoundService = Depends(get_service),
):
    """Edita el texto de un comentario (gestión operativa)."""
    await service.editar_comentario(comentario_id, current_user.id, current_user.roles, body)


@router.delete("/comentarios/{comentario_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_comentario_propio(
    comentario_id: str,
    current_user: AuthUserResponse = Depends(get_current_user),
    service: LostFoundService = Depends(get_service),
):
    await service.eliminar_comentario_propio(comentario_id, current_user.id)


@router.delete("/comentarios/{comentario_id}/gestion", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_comentario_gestion(
    comentario_id: str,
    current_user: AuthUserResponse = Depends(require_lost_found_access),
    service: LostFoundService = Depends(get_service),
):
    """Elimina (soft-delete) un comentario preservando el hilo. Gestión operativa."""
    await service.eliminar_comentario_admin(comentario_id, current_user.id, current_user.roles)


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
    current_user: AuthUserResponse = Depends(require_lost_found_access),
    service: LostFoundService = Depends(get_service),
):
    return await service.crear_custodia(caso_id, current_user.id, body)


@router.get("/custodias", response_model=CustodiaLfListResponse)
async def listar_custodias(
    estado: str | None = Query(default=None),
    search: str | None = Query(default=None),
    vencimiento: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    _user: AuthUserResponse = Depends(require_lost_found_access),
    service: LostFoundService = Depends(get_service),
):
    return await service.listar_custodias(
        estados=_parse_enum_csv(estado, EstadoCustodia),
        search=search,
        vencimientos=_parse_choice_csv(vencimiento, {"vigente", "proxima", "vencida"}),
        page=page,
        per_page=per_page,
    )


@router.patch("/custodias/{custodia_id}", response_model=CustodiaLfItem)
async def actualizar_custodia(
    custodia_id: str,
    body: CustodiaLfUpdateInput,
    current_user: AuthUserResponse = Depends(require_lost_found_access),
    service: LostFoundService = Depends(get_service),
):
    return await service.actualizar_custodia(custodia_id, current_user.id, body)


@router.post("/custodias/{custodia_id}/devolucion", status_code=status.HTTP_204_NO_CONTENT)
async def registrar_devolucion(
    custodia_id: str,
    body: DevolucionLfInput,
    current_user: AuthUserResponse = Depends(require_lost_found_access),
    service: LostFoundService = Depends(get_service),
):
    await service.registrar_devolucion(custodia_id, current_user.id, body)


@router.post("/custodias/{custodia_id}/descarte", status_code=status.HTTP_204_NO_CONTENT)
async def registrar_descarte(
    custodia_id: str,
    body: DescarteLfInput,
    current_user: AuthUserResponse = Depends(require_lost_found_access),
    service: LostFoundService = Depends(get_service),
):
    await service.registrar_descarte(custodia_id, current_user.id, body)


@router.post("/custodias/{custodia_id}/revertir", response_model=CustodiaLfItem)
async def revertir_devolucion(
    custodia_id: str,
    current_user: AuthUserResponse = Depends(require_lost_found_access),
    service: LostFoundService = Depends(get_service),
):
    """Revierte la devolución de una custodia y reabre el caso asociado."""
    return await service.revertir_devolucion(custodia_id, current_user.id)


@router.post("/custodias/{custodia_id}/reactivar", response_model=CustodiaLfItem)
async def reactivar_descarte(
    custodia_id: str,
    current_user: AuthUserResponse = Depends(require_lost_found_access),
    service: LostFoundService = Depends(get_service),
):
    """Reactiva una custodia descartada recalculando su estado por vencimiento."""
    return await service.reactivar_descarte(custodia_id, current_user.id)


@router.patch("/comentarios/{comentario_id}/visibilidad", status_code=status.HTTP_204_NO_CONTENT)
async def moderar_comentario(
    comentario_id: str,
    body: ComentarioVisibilidadInput,
    current_user: AuthUserResponse = Depends(require_lost_found_access),
    service: LostFoundService = Depends(get_service),
):
    await service.moderar_comentario(comentario_id, current_user.id, body)


@router.post("/comentarios/{comentario_id}/reaccion", response_model=ComentarioReaccionResult)
async def reaccionar_comentario(
    comentario_id: str,
    current_user: AuthUserResponse = Depends(get_current_user),
    service: LostFoundService = Depends(get_service),
):
    """Alterna la reacción "Destacar" del usuario (una por comentario, no al propio)."""
    return await service.reaccionar_comentario(comentario_id, current_user.id)


@router.patch("/comentarios/{comentario_id}/fijar", status_code=status.HTTP_204_NO_CONTENT)
async def fijar_comentario(
    comentario_id: str,
    body: ComentarioFijarInput,
    current_user: AuthUserResponse = Depends(get_current_user),
    service: LostFoundService = Depends(get_service),
):
    """Fija/desfija un comentario principal (operativo/admin o dueño del hilo)."""
    await service.fijar_comentario(comentario_id, current_user.id, current_user.roles, body)


@router.get("/acceso/mi", response_model=AccesoLfMiResult)
async def obtener_acceso_mi(
    current_user: AuthUserResponse = Depends(get_current_user),
    service: LostFoundService = Depends(get_service),
):
    """Indica si el usuario actual tiene acceso al módulo operativo de Lost & Found."""
    return await service.obtener_acceso_mi(current_user.id, current_user.roles)


@router.get("/acceso/supervisores", response_model=list[SupervisorLfItem])
async def listar_supervisores_acceso(
    _user: AuthUserResponse = Depends(require_roles(ADMIN_ROLES)),
    service: LostFoundService = Depends(get_service),
):
    """Lista los supervisores del sistema y su asignación al módulo (solo administrador)."""
    return await service.listar_supervisores_acceso()


@router.put("/acceso/supervisores", response_model=list[SupervisorLfItem])
async def actualizar_supervisores_acceso(
    body: AccesoLfUpdateInput,
    current_user: AuthUserResponse = Depends(require_roles(ADMIN_ROLES)),
    service: LostFoundService = Depends(get_service),
):
    """Reemplaza el conjunto de supervisores con acceso al módulo (solo administrador)."""
    return await service.set_acceso_supervisores(body.usuario_ids, current_user.id)


@router.get("/kpis", response_model=KpisLfResponse)
async def obtener_kpis(
    _user: AuthUserResponse = Depends(require_lost_found_access),
    service: LostFoundService = Depends(get_service),
):
    return await service.obtener_kpis()


@router.get("/dashboard", response_model=DashboardLfResponse)
async def obtener_dashboard(
    fecha_desde: date = Query(...),
    fecha_hasta: date = Query(...),
    categoria: str | None = Query(default=None),
    estado: str | None = Query(default=None),
    tipo: TipoCasoLF | None = Query(default=None),
    _user: AuthUserResponse = Depends(require_lost_found_access),
    service: LostFoundService = Depends(get_service),
):
    if fecha_hasta < fecha_desde:
        raise HTTPException(status_code=422, detail="La fecha final debe ser posterior a la fecha inicial.")
    if (fecha_hasta - fecha_desde).days > 730:
        raise HTTPException(status_code=422, detail="El rango máximo permitido es de 730 días.")
    return await service.obtener_dashboard(
        fecha_desde=datetime.combine(fecha_desde, time.min, tzinfo=timezone.utc),
        fecha_hasta=datetime.combine(fecha_hasta + timedelta(days=1), time.min, tzinfo=timezone.utc),
        categorias=_parse_uuid_csv(categoria),
        estados=_parse_enum_csv(estado, EstadoCasoLF),
        tipo=tipo.value if tipo else None,
    )


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


@router.get("/matching/configuracion", response_model=MatchingConfigItem)
async def obtener_config_matching(
    _user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: LostFoundService = Depends(get_service),
):
    """Lee el umbral de sugerencia de matching (valor por defecto si no existe)."""
    return await service.obtener_config_matching()


@router.put("/matching/configuracion", response_model=MatchingConfigItem)
async def actualizar_config_matching(
    body: MatchingConfigUpdateInput,
    current_user: AuthUserResponse = Depends(require_roles(ADMIN_ROLES)),
    service: LostFoundService = Depends(get_service),
):
    """Actualiza el umbral de sugerencia (0.00 a 1.00). Solo administrador."""
    return await service.actualizar_config_matching(current_user.id, body)


@router.get("/custodia/politica", response_model=CustodiaPoliticaItem)
async def obtener_politica_custodia(
    _user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: LostFoundService = Depends(get_service),
):
    """Lee la política de custodia y recordatorios (valores por defecto si no existe)."""
    return await service.obtener_politica_custodia()


@router.put("/custodia/politica", response_model=CustodiaPoliticaItem)
async def actualizar_politica_custodia(
    body: CustodiaPoliticaUpdateInput,
    current_user: AuthUserResponse = Depends(require_roles(ADMIN_ROLES)),
    service: LostFoundService = Depends(get_service),
):
    """Actualiza la política de custodia y recordatorios. Solo administrador."""
    return await service.actualizar_politica_custodia(current_user.id, body)
