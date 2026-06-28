"""Business service for omnichannel inbound reports."""

import base64
from typing import Any

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.constants import NivelSeveridad
from app.integrations.messaging import MessagingService
from app.integrations.messaging.evolution_client import EvolutionApiClient
from app.repositories.omnicanal_repository import OmnicanalRepository
from app.schemas.incidente import IncidenteCreateInput
from app.schemas.omnicanal import (
    AsignarConversacionInput,
    ChatbotBorradorUpdateInput,
    CerrarConversacionInput,
    ConversacionDetail,
    ConversacionHistorialDetail,
    ConversacionHistorialListItem,
    ConversacionListItem,
    ConversacionListResponse,
    ConversacionesHistorialResponse,
    CrearIncidenteConversacionInput,
    EventoConversacionOut,
    EventosConversacionResponse,
    MensajeConversacionOut,
    MensajesConversacionResponse,
    OmnicanalRealtimeEvent,
    OmnicanalStats,
    ReporteEntranteCreated,
    UsuarioConversacionOut,
    VincularIncidenteInput,
    WhatsAppWebhookResponse,
)
from app.services.chatbot_service import ChatbotService
from app.services.incidente_service import IncidenteService
from app.services.omnicanal_realtime import omnicanal_realtime_hub


class OmnicanalService:
    _IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    _MAX_IMAGE_BYTES = 10 * 1024 * 1024
    _MAX_IMAGES_PER_MESSAGE = 5

    def __init__(self, db: AsyncSession) -> None:
        self._repo = OmnicanalRepository(db)
        self._messaging = MessagingService()
        self._evolution = EvolutionApiClient()
        self._incidentes = IncidenteService(db)
        self._chatbot = ChatbotService(db)

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
            auto_reactivate_new_cycle = (
                conversacion.estado == "CERRADA" and not incoming.metadata.get("from_me")
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
            if auto_reactivate_new_cycle:
                conversacion = await self._repo.reactivar_conversacion_nuevo_ciclo(
                    conversacion_id=str(conversacion.id),
                    preview=incoming.content_for_storage,
                )
                await self._chatbot.reset_for_new_cycle(
                    str(conversacion.id),
                    reason="AUTO_REOPEN_AFTER_CLOSE",
                )
            else:
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
                if not incoming.metadata.get("from_me"):
                    await self._chatbot.process_incoming_contact_message(
                        conversacion,
                        incoming.content_for_storage,
                    )
                    await self._broadcast_conversacion(
                        "conversacion_actualizada",
                        str(conversacion.id),
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

    async def obtener_stats(self) -> OmnicanalStats:
        data = await self._repo.get_stats()
        return OmnicanalStats(**data)

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
        assigned = await self._repo.list_operadores_asignados(
            [str(row["Conversacion"].id) for row in rows]
        )
        for row in rows:
            row["operadores_asignados"] = assigned.get(str(row["Conversacion"].id), [])
        total = len(rows)
        return ConversacionListResponse(
            items=[self._map_conversacion_row(row) for row in rows],
            total=total,
        )

    async def listar_historial_conversaciones(
        self,
        *,
        search: str | None = None,
        desde: str | None = None,
        hasta: str | None = None,
        limit: int = 80,
    ) -> ConversacionesHistorialResponse:
        safe_limit = max(1, min(limit, 200))
        rows = await self._repo.list_conversaciones_historial(
            search=search,
            desde=desde,
            hasta=hasta,
            limit=safe_limit,
        )
        return ConversacionesHistorialResponse(
            items=[self._map_historial_list_row(row) for row in rows],
            total=len(rows),
        )

    async def obtener_historial_conversacion(self, conversacion_id: str) -> ConversacionHistorialDetail:
        detail, rows = await self._repo.get_conversacion_historial(conversacion_id)
        if not detail:
            raise self._not_found()
        return ConversacionHistorialDetail(
            conversacion=self._map_conversacion_model(detail),
            incidentes=[self._map_incidente_historial_row(row) for row in rows],
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
        await self._chatbot.mark_human_takeover(
            str(conversacion.id),
            reason="Conversacion tomada manualmente por operador.",
        )
        await self._broadcast_conversacion("conversacion_actualizada", str(conversacion.id))
        detail = await self._repo.get_conversacion_detail(str(conversacion.id))
        if detail:
            assigned = await self._repo.list_operadores_asignados([str(conversacion.id)])
            detail["operadores_asignados"] = assigned.get(str(conversacion.id), [])
            return self._map_conversacion_model(detail)
        return self._map_conversacion_model(conversacion)

    async def asignar_conversacion(
        self,
        conversacion_id: str,
        data: AsignarConversacionInput,
        actor_id: str,
    ) -> ConversacionDetail:
        operador_ids = data.operador_ids or ([data.operador_id] if data.operador_id else [])
        operador_ids = [operator_id for operator_id in dict.fromkeys(operador_ids) if operator_id]
        if not operador_ids:
            raise HTTPException(status_code=422, detail="Selecciona al menos un operador activo.")
        conversacion = await self._repo.assign_conversacion(conversacion_id, operador_ids, actor_id)
        if not conversacion:
            raise self._not_found()
        await self._repo.create_evento(
            conversacion_id=conversacion.id,
            tipo_evento="CHAT_ASIGNADO",
            actor_usuario_id=actor_id,
            payload={"operador_ids": operador_ids},
        )
        await self._chatbot.mark_human_takeover(
            str(conversacion.id),
            reason="Conversacion asignada a operador humano.",
        )
        await self._broadcast_conversacion("conversacion_actualizada", str(conversacion.id))
        detail = await self._repo.get_conversacion_detail(str(conversacion.id))
        if detail:
            assigned = await self._repo.list_operadores_asignados([str(conversacion.id)])
            detail["operadores_asignados"] = assigned.get(str(conversacion.id), [])
            return self._map_conversacion_model(detail)
        return self._map_conversacion_model(conversacion)

    async def cerrar_conversacion(
        self,
        conversacion_id: str,
        data: CerrarConversacionInput,
        usuario_id: str,
    ) -> ConversacionDetail:
        detail = await self._repo.get_conversacion_detail(conversacion_id)
        if not detail:
            raise self._not_found()
        current = detail["Conversacion"]
        if current.incidente_id:
            await self._repo.ensure_incident_association(
                conversacion_id=conversacion_id,
                incidente_id=str(current.incidente_id),
                actor_usuario_id=usuario_id,
                actor_tipo="OPERADOR",
                tipo_asociacion="LEGACY_ACTIVA",
            )
            await self._repo.close_active_incident_association(
                conversacion_id=conversacion_id,
                motivo="CONVERSACION_CERRADA",
            )
        conversacion = await self._repo.cerrar_conversacion(
            conversacion_id,
            usuario_id,
            data.motivo,
        )
        if not conversacion:
            raise self._not_found()
        await self._repo.delete_chatbot_state(str(conversacion.id))
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
        await self._chatbot.mark_human_takeover(
            str(conversacion.id),
            reason="Conversacion reabierta y enviada a cola humana.",
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
        if modo == "BOT":
            await self._chatbot.mark_bot_enabled(str(conversacion.id))
        else:
            await self._chatbot.mark_human_takeover(
                str(conversacion.id),
                reason="Modo humano activado manualmente.",
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
        await self._repo.replace_active_incident_association(
            conversacion_id=conversacion_id,
            incidente_id=data.incidente_id,
            actor_usuario_id=usuario_id,
            actor_tipo="OPERADOR",
            tipo_asociacion="VINCULO_MANUAL",
        )
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
                canal_origen="MENSAJERIA",
            ),
        )
        await self._repo.vincular_incidente(conversacion_id, incidente.id)
        await self._repo.replace_active_incident_association(
            conversacion_id=conversacion_id,
            incidente_id=incidente.id,
            actor_usuario_id=usuario_id,
            actor_tipo="OPERADOR",
            tipo_asociacion="CREACION_MANUAL",
        )
        await self._repo.create_evento(
            conversacion_id=conversacion.id,
            tipo_evento="INCIDENTE_CREADO",
            actor_usuario_id=usuario_id,
            payload={"incidente_id": incidente.id, "codigo": incidente.codigo},
        )
        await self._broadcast_conversacion("conversacion_actualizada", str(conversacion.id))
        updated = await self._repo.get_conversacion_detail(conversacion_id)
        return self._map_conversacion_model(updated)

    async def actualizar_borrador_chatbot(
        self,
        conversacion_id: str,
        data: ChatbotBorradorUpdateInput,
        usuario_id: str,
    ) -> ConversacionDetail:
        detail = await self._repo.get_conversacion_detail(conversacion_id)
        if not detail:
            raise self._not_found()

        chatbot_state = await self._repo.get_or_create_chatbot_state(conversacion_id)
        current_draft = dict(chatbot_state.incident_draft or {})
        payload = data.model_dump(exclude_unset=True)

        for field_name in ("titulo", "descripcion", "severidad", "categoria", "lugar_referencia"):
            if field_name not in payload:
                continue
            raw = payload[field_name]
            if raw is None:
                current_draft.pop(field_name, None)
                continue
            value = str(raw).strip()
            if value:
                current_draft[field_name] = value
            else:
                current_draft.pop(field_name, None)

        state_updates: dict[str, Any] = {"incident_draft": current_draft}
        if "ai_summary" in payload:
            summary_raw = payload["ai_summary"]
            state_updates["ai_summary"] = str(summary_raw).strip() if summary_raw else None

        await self._repo.update_chatbot_state(conversacion_id, state_updates)
        await self._repo.create_evento(
            conversacion_id=detail["Conversacion"].id,
            tipo_evento="CHATBOT_BORRADOR_EDITADO",
            actor_usuario_id=usuario_id,
        )
        await self._broadcast_conversacion("conversacion_actualizada", conversacion_id)
        updated = await self._repo.get_conversacion_detail(conversacion_id)
        return self._map_conversacion_model(updated)

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
        await self._chatbot.mark_human_takeover(
            str(conversacion.id),
            reason="Operador respondio manualmente en la conversacion.",
        )
        await self._broadcast_conversacion("mensaje_enviado", str(conversacion.id))
        row = {"MensajeConversacion": mensaje}
        return self._map_mensaje_row(row)

    async def enviar_imagenes(
        self,
        conversacion_id: str,
        archivos: list[UploadFile],
        usuario_id: str,
        caption: str | None = None,
    ) -> MensajesConversacionResponse:
        detail = await self._repo.get_conversacion_detail(conversacion_id)
        if not detail:
            raise self._not_found()
        conversacion = detail["Conversacion"]
        if conversacion.estado == "CERRADA":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No se puede responder una conversacion cerrada.",
            )

        valid_files = [archivo for archivo in archivos if archivo and archivo.filename]
        if not valid_files:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Adjunta al menos una imagen.")
        if len(valid_files) > self._MAX_IMAGES_PER_MESSAGE:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Solo puedes adjuntar hasta {self._MAX_IMAGES_PER_MESSAGE} imagenes.",
            )

        created_messages = []
        for index, archivo in enumerate(valid_files):
            if archivo.content_type not in self._IMAGE_MIME_TYPES:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Tipo de archivo no permitido. Solo se aceptan imagenes jpg, png, webp o gif.",
                )
            content = await archivo.read()
            if len(content) > self._MAX_IMAGE_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Cada imagen debe pesar 10MB o menos.",
                )
            response = await self._evolution.send_image(
                chat_id=self._evolution_recipient(conversacion),
                media_base64=base64.b64encode(content).decode("ascii"),
                mimetype=archivo.content_type,
                filename=archivo.filename or f"imagen-{index + 1}",
                caption=caption if index == 0 else None,
            )
            external_id = self._extract_sent_message_id(response)
            mensaje = await self._repo.create_mensaje_if_missing(
                conversacion_id=conversacion.id,
                external_message_id=external_id,
                direccion="OUTBOUND",
                autor_tipo="OPERADOR",
                autor_usuario_id=usuario_id,
                contenido=caption if index == 0 and caption else archivo.filename,
                tipo_contenido="image",
                estado_entrega="sent",
                payload_raw={
                    "provider_response": response,
                    "filename": archivo.filename,
                    "content_type": archivo.content_type,
                },
            )
            if mensaje:
                created_messages.append(mensaje)

        preview = caption.strip() if caption and caption.strip() else f"{len(created_messages)} imagen(es)"
        await self._repo.update_conversacion_after_message(
            conversacion_id=conversacion.id,
            preview=preview,
            modo_atencion="HUMANO",
            estado="EN_ATENCION",
        )
        await self._repo.create_evento(
            conversacion_id=conversacion.id,
            tipo_evento="IMAGENES_ENVIADAS",
            actor_usuario_id=usuario_id,
            payload={"total": len(created_messages)},
        )
        await self._chatbot.mark_human_takeover(
            str(conversacion.id),
            reason="Operador envio imagenes en la conversacion.",
        )
        await self._broadcast_conversacion("mensaje_enviado", str(conversacion.id))
        return MensajesConversacionResponse(
            items=[self._map_mensaje_row({"MensajeConversacion": mensaje}) for mensaje in created_messages]
        )

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
    def _assigned_users_from_rows(cls, rows: Any) -> list[UsuarioConversacionOut]:
        if not rows:
            return []
        users: list[UsuarioConversacionOut] = []
        for row in rows:
            user = cls._user_from_parts(
                row.get("operador_id"),
                row.get("operador_nombre"),
                row.get("operador_apellido"),
                row.get("operador_email"),
                row.get("operador_avatar_url"),
            )
            if user:
                users.append(user)
        return users

    @classmethod
    def _map_conversacion_row(cls, row: dict[str, Any]) -> ConversacionListItem:
        conversacion = row["Conversacion"]
        is_closed = conversacion.estado == "CERRADA"
        chatbot = None if is_closed else cls._map_chatbot_state(row.get("ChatbotEstadoConversacion"))
        incidente = None
        if row.get("incidente_id"):
            incidente = {
                "id": str(row["incidente_id"]),
                "codigo": row["incidente_codigo"],
                "titulo": row["incidente_titulo"],
                "estado": row["incidente_estado"],
                "severidad": row["incidente_severidad"],
            }
        ultimo_incidente = None
        if row.get("ultimo_incidente_id"):
            ultimo_incidente = {
                "id": str(row["ultimo_incidente_id"]),
                "codigo": row["ultimo_incidente_codigo"],
                "titulo": row["ultimo_incidente_titulo"],
                "estado": row["ultimo_incidente_estado"],
                "severidad": row["ultimo_incidente_severidad"],
            }
        return ConversacionListItem(
            id=str(conversacion.id),
            canal_id=str(conversacion.canal_id),
            external_chat_id=conversacion.external_chat_id,
            telefono_contacto=conversacion.telefono_contacto,
            nombre_contacto=conversacion.nombre_contacto,
            estado=conversacion.estado,
            modo_atencion=None if is_closed else conversacion.modo_atencion,
            prioridad=None if is_closed else conversacion.prioridad,
            operador_asignado=cls._user_from_parts(
                row.get("operador_id"),
                row.get("operador_nombre"),
                row.get("operador_apellido"),
                row.get("operador_email"),
                row.get("operador_avatar_url"),
            ),
            operadores_asignados=cls._assigned_users_from_rows(row.get("operadores_asignados")),
            tomado_por=cls._user_from_parts(
                row.get("tomado_por_id"),
                row.get("tomado_por_nombre"),
                row.get("tomado_por_apellido"),
                row.get("tomado_por_email"),
                row.get("tomado_por_avatar_url"),
            ),
            incidente=incidente,
            ultimo_incidente=ultimo_incidente,
            historico_incidentes_count=int(row.get("historico_incidentes_count") or 0),
            chatbot=chatbot,
            ultimo_mensaje_preview=conversacion.ultimo_mensaje_preview,
            ultimo_mensaje_autor_tipo=row.get("ultimo_mensaje_autor_tipo"),
            ultimo_mensaje_at=conversacion.ultimo_mensaje_at,
            unread_count=0,
            created_at=conversacion.created_at,
            updated_at=conversacion.updated_at,
        )

    @classmethod
    def _map_conversacion_model(cls, conversacion: Any) -> ConversacionDetail:
        row: dict[str, Any] | None = None
        chatbot = None
        incidente = None
        operador_asignado = None
        operadores_asignados: list[UsuarioConversacionOut] = []
        tomado_por = None
        ultimo_incidente = None
        historico_incidentes_count = 0
        is_closed = False
        if isinstance(conversacion, dict):
            row = conversacion
            conversacion = row["Conversacion"]
            is_closed = conversacion.estado == "CERRADA"
            chatbot = None if is_closed else cls._map_chatbot_state(row.get("ChatbotEstadoConversacion"))
            if row.get("incidente_id"):
                incidente = {
                    "id": str(row["incidente_id"]),
                    "codigo": row["incidente_codigo"],
                    "titulo": row["incidente_titulo"],
                    "estado": row["incidente_estado"],
                    "severidad": row["incidente_severidad"],
                }
            if row.get("ultimo_incidente_id"):
                ultimo_incidente = {
                    "id": str(row["ultimo_incidente_id"]),
                    "codigo": row["ultimo_incidente_codigo"],
                    "titulo": row["ultimo_incidente_titulo"],
                    "estado": row["ultimo_incidente_estado"],
                    "severidad": row["ultimo_incidente_severidad"],
                }
            historico_incidentes_count = int(row.get("historico_incidentes_count") or 0)
            operador_asignado = cls._user_from_parts(
                row.get("operador_id"),
                row.get("operador_nombre"),
                row.get("operador_apellido"),
                row.get("operador_email"),
                row.get("operador_avatar_url"),
            )
            operadores_asignados = cls._assigned_users_from_rows(row.get("operadores_asignados"))
            tomado_por = cls._user_from_parts(
                row.get("tomado_por_id"),
                row.get("tomado_por_nombre"),
                row.get("tomado_por_apellido"),
                row.get("tomado_por_email"),
                row.get("tomado_por_avatar_url"),
            )
        else:
            is_closed = conversacion.estado == "CERRADA"
        return ConversacionDetail(
            id=str(conversacion.id),
            canal_id=str(conversacion.canal_id),
            external_chat_id=conversacion.external_chat_id,
            telefono_contacto=conversacion.telefono_contacto,
            nombre_contacto=conversacion.nombre_contacto,
            estado=conversacion.estado,
            modo_atencion=None if is_closed else conversacion.modo_atencion,
            prioridad=None if is_closed else conversacion.prioridad,
            operador_asignado=operador_asignado,
            operadores_asignados=operadores_asignados if not is_closed else [],
            tomado_por=tomado_por,
            incidente=incidente,
            ultimo_incidente=ultimo_incidente,
            historico_incidentes_count=historico_incidentes_count,
            chatbot=chatbot,
            ultimo_mensaje_preview=conversacion.ultimo_mensaje_preview,
            ultimo_mensaje_autor_tipo=row.get("ultimo_mensaje_autor_tipo") if row else None,
            ultimo_mensaje_at=conversacion.ultimo_mensaje_at,
            unread_count=0,
            metadatos=conversacion.metadatos or {},
            created_at=conversacion.created_at,
            updated_at=conversacion.updated_at,
        )

    @staticmethod
    def _map_historial_list_row(row: dict[str, Any]) -> ConversacionHistorialListItem:
        conversacion = row["Conversacion"]
        return ConversacionHistorialListItem(
            id=str(conversacion.id),
            nombre_contacto=conversacion.nombre_contacto,
            telefono_contacto=conversacion.telefono_contacto,
            external_chat_id=conversacion.external_chat_id,
            estado=conversacion.estado,
            ultimo_mensaje_at=conversacion.ultimo_mensaje_at,
            incidentes_count=int(row.get("incidentes_count") or 0),
        )

    @classmethod
    def _map_incidente_historial_row(cls, row: dict[str, Any]) -> dict[str, Any]:
        historial = row["ConversacionIncidenteHistorial"]
        incidente = None
        if row.get("incidente_id"):
            incidente = {
                "id": str(row["incidente_id"]),
                "codigo": row["incidente_codigo"],
                "titulo": row["incidente_titulo"],
                "estado": row["incidente_estado"],
                "severidad": row["incidente_severidad"],
            }
        return {
            "id": str(historial.id),
            "incidente": incidente,
            "actor_usuario": cls._user_from_parts(
                row.get("actor_id"),
                row.get("actor_nombre"),
                row.get("actor_apellido"),
                row.get("actor_email"),
                row.get("actor_avatar_url"),
            ),
            "actor_tipo": historial.actor_tipo,
            "tipo_asociacion": historial.tipo_asociacion,
            "asociado_at": historial.asociado_at,
            "finalizado_at": historial.finalizado_at,
            "motivo_finalizacion": historial.motivo_finalizacion,
        }

    @staticmethod
    def _map_chatbot_state(chatbot_state: Any) -> dict[str, Any] | None:
        if chatbot_state is None:
            return None
        return {
            "bot_status": chatbot_state.bot_status,
            "last_intent": chatbot_state.last_intent,
            "last_action": chatbot_state.last_action,
            "requires_human_review": chatbot_state.requires_human_review,
            "handoff_reason": chatbot_state.handoff_reason,
            "ai_summary": chatbot_state.ai_summary,
            "classification_category": chatbot_state.classification_category,
            "classification_severity": chatbot_state.classification_severity,
            "classification_confidence": chatbot_state.classification_confidence,
            "missing_fields": chatbot_state.missing_fields or [],
            "incident_draft": chatbot_state.incident_draft or {},
            "suggested_reply": chatbot_state.suggested_reply,
            "last_bot_reply": chatbot_state.last_bot_reply,
            "last_user_message_at": chatbot_state.last_user_message_at,
            "last_bot_message_at": chatbot_state.last_bot_message_at,
            "last_processed_at": chatbot_state.last_processed_at,
        }

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
