"""Omnichannel API endpoints."""

from typing import Annotated, Any

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    Request,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_session, require_roles
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.schemas.auth import AuthUserResponse
from app.schemas.omnicanal import (
    AsignarConversacionInput,
    ChatbotBorradorUpdateInput,
    CerrarConversacionInput,
    ConversacionCicloDetail,
    ConversacionDetail,
    ConversacionCiclosDetail,
    ConversacionCiclosListResponse,
    ConversacionHistorialDetail,
    ConversacionListResponse,
    ConversacionesHistorialResponse,
    CrearIncidenteConversacionInput,
    EnviarMensajeInput,
    EventosConversacionResponse,
    MensajeConversacionOut,
    MensajesConversacionResponse,
    OmnicanalStats,
    VincularIncidenteInput,
    WhatsAppWebhookResponse,
)
from app.services.auth_service import AuthService
from app.services.omnicanal_realtime import omnicanal_realtime_hub
from app.services.omnicanal_service import OmnicanalService

router = APIRouter()
OPERATIVE_ROLES = {"administrador", "supervisor"}


def get_service(db: Annotated[AsyncSession, Depends(get_session)]) -> OmnicanalService:
    return OmnicanalService(db)


@router.post("/webhooks/whatsapp", response_model=WhatsAppWebhookResponse)
async def recibir_webhook_whatsapp(
    request: Request,
    service: Annotated[OmnicanalService, Depends(get_service)],
    x_safecampus_provider: Annotated[str | None, Header()] = None,
    x_safecampus_webhook_secret: Annotated[str | None, Header()] = None,
):
    """Receives WhatsApp provider webhooks and stores them as inbound reports."""
    try:
        payload: dict[str, Any] = await request.json()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload JSON invalido.",
        ) from exc

    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload JSON invalido.",
        )

    client_host = request.client.host if request.client else None
    return await service.registrar_whatsapp_webhook(
        payload=payload,
        provider_name=x_safecampus_provider or settings.WHATSAPP_PROVIDER,
        webhook_secret=x_safecampus_webhook_secret,
        ip_origen=client_host,
        user_agent=request.headers.get("user-agent"),
    )


@router.get(
    "/conversaciones/stats",
    response_model=OmnicanalStats,
    dependencies=[Depends(require_roles(OPERATIVE_ROLES))],
)
async def obtener_stats_conversaciones(
    service: Annotated[OmnicanalService, Depends(get_service)],
):
    """Conteo de conversaciones activas agrupadas por estado."""
    return await service.obtener_stats()


@router.get(
    "/conversaciones",
    response_model=ConversacionListResponse,
    dependencies=[Depends(require_roles(OPERATIVE_ROLES))],
)
async def listar_conversaciones(
    service: Annotated[OmnicanalService, Depends(get_service)],
    search: str | None = None,
    estado: str | None = None,
    limit: int = 50,
):
    return await service.listar_conversaciones(search=search, estado=estado, limit=limit)


@router.get(
    "/historial/conversaciones",
    response_model=ConversacionesHistorialResponse,
    dependencies=[Depends(require_roles(OPERATIVE_ROLES))],
)
async def listar_historial_conversaciones(
    service: Annotated[OmnicanalService, Depends(get_service)],
    search: str | None = None,
    desde: str | None = None,
    hasta: str | None = None,
    limit: int = 80,
):
    return await service.listar_historial_conversaciones(
        search=search,
        desde=desde,
        hasta=hasta,
        limit=limit,
    )


@router.get(
    "/historial/conversaciones/{conversacion_id}",
    response_model=ConversacionHistorialDetail,
    dependencies=[Depends(require_roles(OPERATIVE_ROLES))],
)
async def obtener_historial_conversacion(
    conversacion_id: str,
    service: Annotated[OmnicanalService, Depends(get_service)],
):
    return await service.obtener_historial_conversacion(conversacion_id)


@router.get(
    "/ciclos/conversaciones",
    response_model=ConversacionCiclosListResponse,
    dependencies=[Depends(require_roles(OPERATIVE_ROLES))],
)
async def listar_conversaciones_ciclos(
    service: Annotated[OmnicanalService, Depends(get_service)],
    search: str | None = None,
    desde: str | None = None,
    hasta: str | None = None,
    limit: int = 80,
):
    return await service.listar_conversaciones_ciclos(
        search=search,
        desde=desde,
        hasta=hasta,
        limit=limit,
    )


@router.get(
    "/ciclos/conversaciones/{conversacion_id}",
    response_model=ConversacionCiclosDetail,
    dependencies=[Depends(require_roles(OPERATIVE_ROLES))],
)
async def obtener_ciclos_conversacion(
    conversacion_id: str,
    service: Annotated[OmnicanalService, Depends(get_service)],
):
    return await service.obtener_ciclos_conversacion(conversacion_id)


@router.get(
    "/ciclos/{ciclo_id}",
    response_model=ConversacionCicloDetail,
    dependencies=[Depends(require_roles(OPERATIVE_ROLES))],
)
async def obtener_ciclo(
    ciclo_id: str,
    service: Annotated[OmnicanalService, Depends(get_service)],
):
    return await service.obtener_ciclo(ciclo_id)


@router.post("/ciclos/{ciclo_id}/reabrir", response_model=ConversacionDetail)
async def reabrir_ciclo(
    ciclo_id: str,
    service: Annotated[OmnicanalService, Depends(get_service)],
    current_user: Annotated[AuthUserResponse, Depends(require_roles(OPERATIVE_ROLES))],
):
    return await service.reabrir_ciclo(ciclo_id, current_user.id)


@router.get(
    "/conversaciones/{conversacion_id}/mensajes",
    response_model=MensajesConversacionResponse,
    dependencies=[Depends(require_roles(OPERATIVE_ROLES))],
)
async def listar_mensajes(
    conversacion_id: str,
    service: Annotated[OmnicanalService, Depends(get_service)],
    limit: int = 200,
):
    return await service.listar_mensajes(conversacion_id, limit=limit)


@router.get(
    "/conversaciones/{conversacion_id}/eventos",
    response_model=EventosConversacionResponse,
    dependencies=[Depends(require_roles(OPERATIVE_ROLES))],
)
async def listar_eventos(
    conversacion_id: str,
    service: Annotated[OmnicanalService, Depends(get_service)],
    limit: int = 100,
):
    return await service.listar_eventos(conversacion_id, limit=limit)


@router.post(
    "/conversaciones/{conversacion_id}/mensajes",
    response_model=MensajeConversacionOut,
)
async def enviar_mensaje(
    conversacion_id: str,
    body: EnviarMensajeInput,
    service: Annotated[OmnicanalService, Depends(get_service)],
    current_user: Annotated[AuthUserResponse, Depends(require_roles(OPERATIVE_ROLES))],
):
    return await service.enviar_mensaje(
        conversacion_id,
        body.contenido,
        current_user.id,
    )


@router.post(
    "/conversaciones/{conversacion_id}/imagenes",
    response_model=MensajesConversacionResponse,
)
async def enviar_imagenes(
    conversacion_id: str,
    service: Annotated[OmnicanalService, Depends(get_service)],
    current_user: Annotated[AuthUserResponse, Depends(require_roles(OPERATIVE_ROLES))],
    archivos: list[UploadFile] = File(...),
    caption: str | None = Form(default=None),
):
    return await service.enviar_imagenes(
        conversacion_id,
        archivos,
        current_user.id,
        caption=caption,
    )


@router.post("/conversaciones/{conversacion_id}/tomar", response_model=ConversacionDetail)
async def tomar_conversacion(
    conversacion_id: str,
    service: Annotated[OmnicanalService, Depends(get_service)],
    current_user: Annotated[AuthUserResponse, Depends(require_roles(OPERATIVE_ROLES))],
):
    return await service.tomar_conversacion(conversacion_id, current_user.id)


@router.post("/conversaciones/{conversacion_id}/asignar", response_model=ConversacionDetail)
async def asignar_conversacion(
    conversacion_id: str,
    body: AsignarConversacionInput,
    service: Annotated[OmnicanalService, Depends(get_service)],
    current_user: Annotated[AuthUserResponse, Depends(require_roles(OPERATIVE_ROLES))],
):
    return await service.asignar_conversacion(conversacion_id, body, current_user.id)


@router.post("/conversaciones/{conversacion_id}/cerrar", response_model=ConversacionDetail)
async def cerrar_conversacion(
    conversacion_id: str,
    body: CerrarConversacionInput,
    service: Annotated[OmnicanalService, Depends(get_service)],
    current_user: Annotated[AuthUserResponse, Depends(require_roles(OPERATIVE_ROLES))],
):
    return await service.cerrar_conversacion(conversacion_id, body, current_user.id)


@router.post("/conversaciones/{conversacion_id}/reabrir", response_model=ConversacionDetail)
async def reabrir_conversacion(
    conversacion_id: str,
    service: Annotated[OmnicanalService, Depends(get_service)],
    current_user: Annotated[AuthUserResponse, Depends(require_roles(OPERATIVE_ROLES))],
):
    return await service.reabrir_conversacion(conversacion_id, current_user.id)


@router.post("/conversaciones/{conversacion_id}/modo-bot", response_model=ConversacionDetail)
async def activar_bot(
    conversacion_id: str,
    service: Annotated[OmnicanalService, Depends(get_service)],
    current_user: Annotated[AuthUserResponse, Depends(require_roles(OPERATIVE_ROLES))],
):
    return await service.set_modo(conversacion_id, "BOT", current_user.id)


@router.post("/conversaciones/{conversacion_id}/modo-humano", response_model=ConversacionDetail)
async def activar_humano(
    conversacion_id: str,
    service: Annotated[OmnicanalService, Depends(get_service)],
    current_user: Annotated[AuthUserResponse, Depends(require_roles(OPERATIVE_ROLES))],
):
    return await service.set_modo(conversacion_id, "HUMANO", current_user.id)


@router.post(
    "/conversaciones/{conversacion_id}/vincular-incidente",
    response_model=ConversacionDetail,
)
async def vincular_incidente(
    conversacion_id: str,
    body: VincularIncidenteInput,
    service: Annotated[OmnicanalService, Depends(get_service)],
    current_user: Annotated[AuthUserResponse, Depends(require_roles(OPERATIVE_ROLES))],
):
    return await service.vincular_incidente(conversacion_id, body, current_user.id)


@router.post(
    "/conversaciones/{conversacion_id}/crear-incidente",
    response_model=ConversacionDetail,
)
async def crear_incidente(
    conversacion_id: str,
    body: CrearIncidenteConversacionInput,
    service: Annotated[OmnicanalService, Depends(get_service)],
    current_user: Annotated[AuthUserResponse, Depends(require_roles(OPERATIVE_ROLES))],
):
    return await service.crear_incidente_desde_conversacion(
        conversacion_id,
        body,
        current_user.id,
    )


@router.patch(
    "/conversaciones/{conversacion_id}/chatbot-borrador",
    response_model=ConversacionDetail,
)
async def actualizar_borrador_chatbot(
    conversacion_id: str,
    body: ChatbotBorradorUpdateInput,
    service: Annotated[OmnicanalService, Depends(get_service)],
    current_user: Annotated[AuthUserResponse, Depends(require_roles(OPERATIVE_ROLES))],
):
    return await service.actualizar_borrador_chatbot(
        conversacion_id,
        body,
        current_user.id,
    )


@router.websocket("/ws")
async def websocket_omnicanal(websocket: WebSocket):
    session_token = websocket.cookies.get(settings.SESSION_COOKIE_NAME)
    async with AsyncSessionLocal() as db:
        try:
            current_user = await AuthService(db).get_user_from_session_token(session_token)
        except HTTPException:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        if not OPERATIVE_ROLES.intersection(current_user.roles):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    await omnicanal_realtime_hub.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        omnicanal_realtime_hub.disconnect(websocket)
