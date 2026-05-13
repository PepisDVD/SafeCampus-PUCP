"""Business service for omnichannel inbound reports."""

from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.constants import NivelSeveridad
from app.integrations.messaging import MessagingService
from app.integrations.messaging.evolution_client import EvolutionApiClient
from app.repositories.omnicanal_repository import OmnicanalRepository
from app.schemas.incidente import IncidenteCreateInput
from app.schemas.omnicanal import (
    AsignarConversacionInput,
    CerrarConversacionInput,
    ConversacionDetail,
    ConversacionListItem,
    ConversacionListResponse,
    CrearIncidenteConversacionInput,
    EventoConversacionOut,
    EventosConversacionResponse,
    MensajeConversacionOut,
    MensajesConversacionResponse,
    OmnicanalRealtimeEvent,
    ReporteEntranteCreated,
    UsuarioConversacionOut,
    VincularIncidenteInput,
    WhatsAppWebhookResponse,
)
from app.services.incidente_service import IncidenteService
from app.services.omnicanal_realtime import omnicanal_realtime_hub


class OmnicanalService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = OmnicanalRepository(db)
        self._messaging = MessagingService()
        self._evolution = EvolutionApiClient()
        self._incidentes = IncidenteService(db)

    async def registrar_whatsapp_webhook(
        self,
        *,
        payload: dict[str, Any],
        provider_name: str | None,
        webhook_secret: str | None,
        ip_origen: str | None,
        user_agent: str | None,
    ) -> WhatsAppWebhookResponse:
        self._validate_webhook_secret(webhook_secret)
        incoming = self._messaging.parse_incoming_webhook(
            payload,
            provider_name=provider_name,
        )
        if self._should_ignore_group(incoming.is_group):
            return WhatsAppWebhookResponse(
                ok=True,
                ignored=True,
                detail="Mensaje ignorado porque proviene de un grupo de WhatsApp.",
            )

        if self._should_ignore_sender(incoming.sender_phone):
            return WhatsAppWebhookResponse(
                ok=True,
                ignored=True,
                detail="Mensaje ignorado por allowlist local de WhatsApp.",
            )

        channel = await self._repo.get_or_create_whatsapp_channel(
            provider=incoming.provider,
            instance_name=incoming.instance_name,
        )
        metadata = {
            "provider": incoming.provider,
            "external_message_id": incoming.external_message_id,
            "instance_name": incoming.instance_name,
            "sender_phone": incoming.sender_phone,
            "sender_name": incoming.sender_name,
            "chat_id": incoming.chat_id,
            "message_type": incoming.message_type,
            "event_type": incoming.event_type,
            "content_preview": incoming.content_for_storage[:240],
            **incoming.metadata,
        }
        reporte = await self._repo.create_reporte_entrante(
            canal_id=channel.id,
            contenido_raw=incoming.raw_payload,
            metadatos_canal=metadata,
            ip_origen=ip_origen,
            user_agent=user_agent,
        )
        conversacion = None
        if incoming.event_type == "messages.upsert" and incoming.chat_id:
            conversacion = await self._repo.get_or_create_conversacion(
                canal_id=channel.id,
                external_chat_id=incoming.chat_id,
                telefono_contacto=incoming.sender_phone,
                nombre_contacto=incoming.sender_name,
                metadatos={
                    "provider": incoming.provider,
                    "instance_name": incoming.instance_name,
                    "chat_id": incoming.chat_id,
                },
            )
            mensaje = await self._repo.create_mensaje_if_missing(
                conversacion_id=conversacion.id,
                external_message_id=incoming.external_message_id,
                direccion="OUTBOUND" if incoming.metadata.get("from_me") else "INBOUND",
                autor_tipo="OPERADOR" if incoming.metadata.get("from_me") else "CONTACTO",
                contenido=incoming.content_for_storage,
                tipo_contenido=incoming.message_type,
                estado_entrega="sent" if incoming.metadata.get("from_me") else "received",
                payload_raw=incoming.raw_payload,
            )
            conversacion = await self._repo.update_conversacion_after_message(
                conversacion_id=conversacion.id,
                preview=incoming.content_for_storage,
                estado="EN_BOT" if conversacion.estado == "ABIERTA" else None,
            )
            if mensaje:
                await self._repo.create_evento(
                    conversacion_id=conversacion.id,
                    tipo_evento="MENSAJE_RECIBIDO"
                    if not incoming.metadata.get("from_me")
                    else "MENSAJE_SALIENTE_REGISTRADO",
                    payload={
                        "message_id": str(mensaje.id),
                        "external_message_id": incoming.external_message_id,
                    },
                )
                await omnicanal_realtime_hub.broadcast(
                    OmnicanalRealtimeEvent(
                        type="mensaje_recibido",
                        conversacion_id=str(conversacion.id),
                        payload={"message_id": str(mensaje.id)},
                    )
                )
        return WhatsAppWebhookResponse(
            reporte=ReporteEntranteCreated(
                id=str(reporte.id),
                canal_id=str(channel.id),
                provider=incoming.provider,
                external_message_id=incoming.external_message_id,
                sender_phone=incoming.sender_phone,
                message_type=incoming.message_type,
                estado=str(reporte.estado),
                created_at=reporte.created_at,
            )
        )

    async def listar_conversaciones(
        self,
        *,
        search: str | None = None,
        estado: str | None = None,
        limit: int = 50,
    ) -> ConversacionListResponse:
        safe_limit = max(1, min(limit, 200))
        rows = await self._repo.list_conversaciones(
            search=search,
            estado=estado,
            limit=safe_limit,
        )
        total = await self._repo.count_conversaciones(search=search, estado=estado)
        return ConversacionListResponse(
            items=[self._map_conversacion_row(row) for row in rows],
            total=total,
        )

    async def listar_mensajes(
        self,
        conversacion_id: str,
        limit: int = 200,
    ) -> MensajesConversacionResponse:
        rows = await self._repo.list_mensajes(conversacion_id, limit=max(1, min(limit, 500)))
        return MensajesConversacionResponse(items=[self._map_mensaje_row(row) for row in rows])

    async def listar_eventos(
        self,
        conversacion_id: str,
        limit: int = 100,
    ) -> EventosConversacionResponse:
        rows = await self._repo.list_eventos(conversacion_id, limit=max(1, min(limit, 300)))
        return EventosConversacionResponse(items=[self._map_evento_row(row) for row in rows])

    async def tomar_conversacion(self, conversacion_id: str, usuario_id: str) -> ConversacionDetail:
        conversacion = await self._repo.tomar_conversacion(conversacion_id, usuario_id)
        if not conversacion:
            raise self._not_found()
        await self._repo.create_evento(
            conversacion_id=conversacion.id,
            tipo_evento="CHAT_TOMADO",
            actor_usuario_id=usuario_id,
        )
        await self._broadcast_conversacion("conversacion_actualizada", str(conversacion.id))
        return self._map_conversacion_model(conversacion)

    async def asignar_conversacion(
        self,
        conversacion_id: str,
        data: AsignarConversacionInput,
        actor_id: str,
    ) -> ConversacionDetail:
        conversacion = await self._repo.assign_conversacion(conversacion_id, data.operador_id)
        if not conversacion:
            raise self._not_found()
        await self._repo.create_evento(
            conversacion_id=conversacion.id,
            tipo_evento="CHAT_ASIGNADO",
            actor_usuario_id=actor_id,
            payload={"operador_id": data.operador_id},
        )
        await self._broadcast_conversacion("conversacion_actualizada", str(conversacion.id))
        return self._map_conversacion_model(conversacion)

    async def cerrar_conversacion(
        self,
        conversacion_id: str,
        data: CerrarConversacionInput,
        usuario_id: str,
    ) -> ConversacionDetail:
        conversacion = await self._repo.cerrar_conversacion(
            conversacion_id,
            usuario_id,
            data.motivo,
        )
        if not conversacion:
            raise self._not_found()
        await self._repo.create_evento(
            conversacion_id=conversacion.id,
            tipo_evento="CHAT_CERRADO",
            actor_usuario_id=usuario_id,
            payload={"motivo": data.motivo},
        )
        await self._broadcast_conversacion("conversacion_actualizada", str(conversacion.id))
        return self._map_conversacion_model(conversacion)

    async def reabrir_conversacion(
        self,
        conversacion_id: str,
        usuario_id: str,
    ) -> ConversacionDetail:
        conversacion = await self._repo.reabrir_conversacion(conversacion_id)
        if not conversacion:
            raise self._not_found()
        await self._repo.create_evento(
            conversacion_id=conversacion.id,
            tipo_evento="CHAT_REABIERTO",
            actor_usuario_id=usuario_id,
        )
        await self._broadcast_conversacion("conversacion_actualizada", str(conversacion.id))
        return self._map_conversacion_model(conversacion)

    async def set_modo(
        self,
        conversacion_id: str,
        modo: str,
        usuario_id: str,
    ) -> ConversacionDetail:
        conversacion = await self._repo.set_modo(conversacion_id, modo)
        if not conversacion:
            raise self._not_found()
        await self._repo.create_evento(
            conversacion_id=conversacion.id,
            tipo_evento="MODO_BOT_ACTIVADO" if modo == "BOT" else "MODO_HUMANO_ACTIVADO",
            actor_usuario_id=usuario_id,
        )
        await self._broadcast_conversacion("conversacion_actualizada", str(conversacion.id))
        return self._map_conversacion_model(conversacion)

    async def vincular_incidente(
        self,
        conversacion_id: str,
        data: VincularIncidenteInput,
        usuario_id: str,
    ) -> ConversacionDetail:
        conversacion = await self._repo.vincular_incidente(conversacion_id, data.incidente_id)
        if not conversacion:
            raise self._not_found()
        await self._repo.create_evento(
            conversacion_id=conversacion.id,
            tipo_evento="INCIDENTE_VINCULADO",
            actor_usuario_id=usuario_id,
            payload={"incidente_id": data.incidente_id},
        )
        await self._broadcast_conversacion("conversacion_actualizada", str(conversacion.id))
        return self._map_conversacion_model(conversacion)

    async def crear_incidente_desde_conversacion(
        self,
        conversacion_id: str,
        data: CrearIncidenteConversacionInput,
        usuario_id: str,
    ) -> ConversacionDetail:
        detail = await self._repo.get_conversacion_detail(conversacion_id)
        if not detail:
            raise self._not_found()
        conversacion = detail["Conversacion"]
        title = (data.titulo or "").strip()
        incidente = await self._incidentes.crear_incidente(
            usuario_id,
            IncidenteCreateInput(
                titulo=(
                    title
                    or f"Reporte WhatsApp {conversacion.telefono_contacto or ''}".strip()
                    or "Reporte WhatsApp"
                ),
                descripcion=self._incident_description(data.descripcion, conversacion),
                severidad=NivelSeveridad(data.severidad) if data.severidad else None,
                categoria=data.categoria or "WhatsApp",
                lugar_referencia=data.lugar_referencia,
            ),
        )
        await self._repo.vincular_incidente(conversacion_id, incidente.id)
        await self._repo.create_evento(
            conversacion_id=conversacion.id,
            tipo_evento="INCIDENTE_CREADO",
            actor_usuario_id=usuario_id,
            payload={"incidente_id": incidente.id, "codigo": incidente.codigo},
        )
        await self._broadcast_conversacion("conversacion_actualizada", str(conversacion.id))
        updated = await self._repo.get_conversacion_detail(conversacion_id)
        return self._map_conversacion_model(updated["Conversacion"])

    async def enviar_mensaje(
        self,
        conversacion_id: str,
        contenido: str,
        usuario_id: str,
    ) -> MensajeConversacionOut:
        detail = await self._repo.get_conversacion_detail(conversacion_id)
        if not detail:
            raise self._not_found()
        conversacion = detail["Conversacion"]
        if conversacion.estado == "CERRADA":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No se puede responder una conversacion cerrada.",
            )
        response = await self._evolution.send_text(
            chat_id=self._evolution_recipient(conversacion),
            text=contenido,
        )
        external_id = self._extract_sent_message_id(response)
        mensaje = await self._repo.create_mensaje_if_missing(
            conversacion_id=conversacion.id,
            external_message_id=external_id,
            direccion="OUTBOUND",
            autor_tipo="OPERADOR",
            autor_usuario_id=usuario_id,
            contenido=contenido,
            tipo_contenido="text",
            estado_entrega="sent",
            payload_raw=response,
        )
        await self._repo.update_conversacion_after_message(
            conversacion_id=conversacion.id,
            preview=contenido,
            modo_atencion="HUMANO",
            estado="EN_ATENCION",
        )
        await self._repo.create_evento(
            conversacion_id=conversacion.id,
            tipo_evento="MENSAJE_ENVIADO",
            actor_usuario_id=usuario_id,
            payload={"message_id": str(mensaje.id) if mensaje else None},
        )
        await self._broadcast_conversacion("mensaje_enviado", str(conversacion.id))
        row = {"MensajeConversacion": mensaje}
        return self._map_mensaje_row(row)

    @staticmethod
    def _validate_webhook_secret(webhook_secret: str | None) -> None:
        expected_secret = settings.EVOLUTION_WEBHOOK_SECRET.strip()
        if not expected_secret:
            return
        if webhook_secret != expected_secret:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Webhook de WhatsApp no autorizado.",
            )

    @staticmethod
    def _should_ignore_sender(sender_phone: str | None) -> bool:
        allowed = settings.whatsapp_allowed_test_phones_set
        if not allowed:
            return False
        normalized_sender = "".join(char for char in (sender_phone or "") if char.isdigit())
        return normalized_sender not in allowed

    @staticmethod
    def _should_ignore_group(is_group: bool) -> bool:
        return settings.WHATSAPP_IGNORE_GROUP_MESSAGES and is_group

    @staticmethod
    def _not_found() -> HTTPException:
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversacion no encontrada.",
        )

    @staticmethod
    def _user_from_parts(
        user_id: Any,
        nombre: str | None,
        apellido: str | None,
        email: str | None,
        avatar_url: str | None,
    ) -> UsuarioConversacionOut | None:
        if not user_id:
            return None
        return UsuarioConversacionOut(
            id=str(user_id),
            nombre_completo=f"{nombre or ''} {apellido or ''}".strip() or "Usuario",
            email=email,
            avatar_url=avatar_url,
        )

    @classmethod
    def _map_conversacion_row(cls, row: dict[str, Any]) -> ConversacionListItem:
        conversacion = row["Conversacion"]
        incidente = None
        if row.get("incidente_id"):
            incidente = {
                "id": str(row["incidente_id"]),
                "codigo": row["incidente_codigo"],
                "titulo": row["incidente_titulo"],
                "estado": row["incidente_estado"],
                "severidad": row["incidente_severidad"],
            }
        return ConversacionListItem(
            id=str(conversacion.id),
            canal_id=str(conversacion.canal_id),
            external_chat_id=conversacion.external_chat_id,
            telefono_contacto=conversacion.telefono_contacto,
            nombre_contacto=conversacion.nombre_contacto,
            estado=conversacion.estado,
            modo_atencion=conversacion.modo_atencion,
            prioridad=conversacion.prioridad,
            operador_asignado=cls._user_from_parts(
                row.get("operador_id"),
                row.get("operador_nombre"),
                row.get("operador_apellido"),
                row.get("operador_email"),
                row.get("operador_avatar_url"),
            ),
            tomado_por=None,
            incidente=incidente,
            ultimo_mensaje_preview=conversacion.ultimo_mensaje_preview,
            ultimo_mensaje_at=conversacion.ultimo_mensaje_at,
            unread_count=0,
            created_at=conversacion.created_at,
            updated_at=conversacion.updated_at,
        )

    @staticmethod
    def _map_conversacion_model(conversacion: Any) -> ConversacionDetail:
        return ConversacionDetail(
            id=str(conversacion.id),
            canal_id=str(conversacion.canal_id),
            external_chat_id=conversacion.external_chat_id,
            telefono_contacto=conversacion.telefono_contacto,
            nombre_contacto=conversacion.nombre_contacto,
            estado=conversacion.estado,
            modo_atencion=conversacion.modo_atencion,
            prioridad=conversacion.prioridad,
            operador_asignado=None,
            tomado_por=None,
            incidente=None,
            ultimo_mensaje_preview=conversacion.ultimo_mensaje_preview,
            ultimo_mensaje_at=conversacion.ultimo_mensaje_at,
            unread_count=0,
            metadatos=conversacion.metadatos or {},
            created_at=conversacion.created_at,
            updated_at=conversacion.updated_at,
        )

    @classmethod
    def _map_mensaje_row(cls, row: dict[str, Any]) -> MensajeConversacionOut:
        mensaje = row["MensajeConversacion"]
        return MensajeConversacionOut(
            id=str(mensaje.id),
            conversacion_id=str(mensaje.conversacion_id),
            external_message_id=mensaje.external_message_id,
            direccion=mensaje.direccion,
            autor_tipo=mensaje.autor_tipo,
            autor_usuario=cls._user_from_parts(
                row.get("autor_id"),
                row.get("autor_nombre"),
                row.get("autor_apellido"),
                row.get("autor_email"),
                row.get("autor_avatar_url"),
            ),
            contenido=mensaje.contenido,
            tipo_contenido=mensaje.tipo_contenido,
            estado_entrega=mensaje.estado_entrega,
            created_at=mensaje.created_at,
        )

    @classmethod
    def _map_evento_row(cls, row: dict[str, Any]) -> EventoConversacionOut:
        evento = row["EventoConversacion"]
        return EventoConversacionOut(
            id=str(evento.id),
            conversacion_id=str(evento.conversacion_id),
            tipo_evento=evento.tipo_evento,
            actor_usuario=cls._user_from_parts(
                row.get("actor_id"),
                row.get("actor_nombre"),
                row.get("actor_apellido"),
                row.get("actor_email"),
                row.get("actor_avatar_url"),
            ),
            payload=evento.payload or {},
            created_at=evento.created_at,
        )

    async def _broadcast_conversacion(self, event_type: str, conversacion_id: str) -> None:
        await omnicanal_realtime_hub.broadcast(
            OmnicanalRealtimeEvent(type=event_type, conversacion_id=conversacion_id)
        )

    @staticmethod
    def _extract_sent_message_id(response: dict[str, Any]) -> str | None:
        key = response.get("key") if isinstance(response.get("key"), dict) else {}
        return key.get("id") or response.get("id") or response.get("messageId")

    @staticmethod
    def _incident_description(raw_description: str | None, conversacion: Any) -> str:
        description = (
            raw_description
            or conversacion.ultimo_mensaje_preview
            or "Reporte recibido desde WhatsApp."
        ).strip()
        if len(description) < 10:
            return f"Reporte recibido desde WhatsApp: {description}"
        return description

    @staticmethod
    def _evolution_recipient(conversacion: Any) -> str:
        if conversacion.telefono_contacto:
            return conversacion.telefono_contacto
        return str(conversacion.external_chat_id).split("@", maxsplit=1)[0]
