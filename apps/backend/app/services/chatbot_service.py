"""Operational chatbot orchestration for WhatsApp conversations.

El bot de WhatsApp usa una unica capa conversacional
(`WhatsAppBotDecisionService` + `PROMPT-WHATSAPP-BOT-v1.0`) para decidir la
siguiente accion de cada turno: responder, recolectar datos, registrar un
incidente o derivar a un operador humano. Esta capa es independiente del
clasificador formal de incidentes (`PROMPT-IA-CLAS-v1.0`), que se mantiene sin
cambios para los demas modulos.
"""

from __future__ import annotations

import logging
import re
from datetime import UTC, datetime, timedelta
from typing import Any

from app.core.config import settings
from app.core.constants import NivelSeveridad, TipoCanal
from app.integrations.messaging.evolution_client import EvolutionApiClient
from app.llm.schemas import WhatsAppBotDecision, WhatsAppBotDecisionResult, WhatsAppBotIntent
from app.repositories.maestros_repository import MaestrosRepository
from app.repositories.omnicanal_repository import OmnicanalRepository
from app.schemas.incidente import IncidenteCreateInput, IncidentePriorizacionAi
from app.schemas.omnicanal import MensajeConversacionOut
from app.services.incidente_service import IncidenteService
from app.services.ubicacion_matcher import UbicacionMatcher
from app.services.whatsapp_bot_decision_service import WhatsAppBotDecisionService

logger = logging.getLogger(__name__)

SYSTEM_LOCATION_HINTS = (
    "biblioteca",
    "cafeteria",
    "laboratorio",
    "pabellon",
    "puerta",
    "entrada",
    "estacionamiento",
    "patio",
    "campus",
    "facultad",
)

# Cantidad de mensajes recientes que se cargan como contexto del turno (LLM +
# snapshot de memoria). Menos mensajes => menos tokens de entrada => respuesta
# del bot más rápida, manteniendo contexto suficiente del hilo.
_RECENT_MESSAGES_LIMIT = 8

# Orden de severidad: al fusionar el borrador entre turnos se escala pero nunca
# se degrada (se conserva la severidad más alta observada en el ciclo).
_SEVERITY_ORDER = {"BAJO": 1, "MEDIO": 2, "ALTO": 3, "CRITICO": 4}

# Intenciones que justifican (re)construir el borrador de incidente.
_INCIDENT_RELATED_INTENTS = {
    WhatsAppBotIntent.INCIDENT_REPORT,
    WhatsAppBotIntent.EMERGENCY,
    WhatsAppBotIntent.PROVIDE_DETAILS,
}


class ChatbotService:
    def __init__(self, db: Any) -> None:
        self._repo = OmnicanalRepository(db)
        self._evolution = EvolutionApiClient()
        self._bot_decider = WhatsAppBotDecisionService()
        self._incidentes = IncidenteService(db)
        self._ubicacion_matcher = UbicacionMatcher(MaestrosRepository(db))

    async def process_incoming_contact_message(
        self,
        conversacion: Any,
        incoming_message: str,
        *,
        latitud: float | None = None,
        longitud: float | None = None,
    ) -> None:
        if not settings.CHATBOT_ENABLED or not incoming_message.strip():
            return

        chatbot_state = await self._repo.get_or_create_chatbot_state(str(conversacion.id))
        if conversacion.estado == "CERRADA":
            return

        if conversacion.modo_atencion == "HUMANO":
            await self._repo.update_chatbot_state(
                str(conversacion.id),
                {
                    "bot_status": "HUMAN_ACTIVE",
                    "last_action": "STAY_SILENT",
                    "last_intent": "HUMAN_QUEUE",
                    "last_user_message_at": datetime.now(UTC),
                    "last_processed_at": datetime.now(UTC),
                },
            )
            return

        # Si pasó demasiado tiempo desde la última interacción, el borrador y el
        # contexto guardado se consideran vencidos: se limpian antes de procesar
        # para no arrastrar datos viejos a una conversación retomada más tarde.
        if self._context_is_stale(chatbot_state):
            await self.reset_for_new_cycle(str(conversacion.id), reason="AUTO_EXPIRE_STALE_DRAFT")
            chatbot_state = await self._repo.get_or_create_chatbot_state(str(conversacion.id))

        recent_rows = await self._repo.list_mensajes(
            str(conversacion.id), limit=_RECENT_MESSAGES_LIMIT
        )
        recent_rows = self._filter_messages_for_active_cycle(chatbot_state, recent_rows)
        normalized_text = incoming_message.strip()
        incident_exists = bool(conversacion.incidente_id)

        decision_result = await self._bot_decider.decide(
            conversation_state=chatbot_state.bot_status or "BOT_NEW",
            last_user_message=normalized_text,
            recent_messages=self._recent_messages_for_llm(recent_rows, normalized_text),
            incident_exists=incident_exists,
            incident_draft=chatbot_state.incident_draft or {},
            correlation_id=str(conversacion.id),
        )
        decision = decision_result.decision

        await self._persist_llm_usage(conversacion, decision_result)

        location = decision.incident_location or self._extract_location(
            normalized_text, chatbot_state.incident_draft or {}
        )
        # Prioridad de geolocalización:
        # 1) GPS que el usuario compartió (exacto) + nombre de la ubicación
        #    maestra más cercana como referencia legible.
        # 2) Si no hay GPS, match por texto contra el maestro (nombre + coords).
        final_lat: float | None = None
        final_lng: float | None = None
        if latitud is not None and longitud is not None:
            final_lat, final_lng = latitud, longitud
            nearby = await self._ubicacion_matcher.resolve_by_coords(latitud, longitud)
            if nearby:
                location = nearby.nombre
            elif not location:
                location = "Ubicación GPS compartida"
        else:
            resolved = await self._ubicacion_matcher.resolve(location or normalized_text)
            if resolved:
                location = resolved.nombre
                final_lat = resolved.latitud
                final_lng = resolved.longitud

        prev_draft = chatbot_state.incident_draft or {}
        if self._is_incident_related(decision):
            draft = self._build_incident_draft(
                conversacion, normalized_text, location, decision, prev_draft
            )
            if final_lat is not None and final_lng is not None:
                draft["latitud"] = final_lat
                draft["longitud"] = final_lng
            elif prev_draft.get("latitud") is not None and prev_draft.get("longitud") is not None:
                # Conserva las coordenadas resueltas en un turno anterior.
                draft["latitud"] = prev_draft["latitud"]
                draft["longitud"] = prev_draft["longitud"]
        else:
            draft = dict(prev_draft)
            # Una ubicación compartida siempre actualiza el geo del borrador,
            # aunque el turno no sea "incident-related" para el LLM.
            if final_lat is not None and final_lng is not None:
                draft["latitud"] = final_lat
                draft["longitud"] = final_lng
                if location:
                    draft["lugar_referencia"] = location

        incident_id = str(conversacion.incidente_id) if conversacion.incidente_id else None
        incident_code: str | None = None
        incident_created = False
        if decision.should_create_incident and not incident_id:
            incident_id, incident_code = await self._create_incident_from_decision(draft, decision)
            if incident_id:
                incident_created = True
                await self._repo.vincular_incidente(str(conversacion.id), incident_id)
                await self._repo.replace_active_incident_association(
                    conversacion_id=str(conversacion.id),
                    incidente_id=incident_id,
                    actor_tipo="BOT",
                    tipo_asociacion="AUTOMATICA_BOT",
                )

        priority = self._resolve_priority(decision)
        if decision.should_handoff:
            await self._repo.update_conversacion_chatbot_routing(
                str(conversacion.id),
                prioridad=priority,
                estado="EN_COLA",
                modo_atencion="HUMANO",
                incidente_id=incident_id,
            )
        else:
            await self._repo.update_conversacion_chatbot_routing(
                str(conversacion.id),
                prioridad=priority,
                estado="EN_BOT",
                modo_atencion="BOT",
                incidente_id=incident_id,
            )

        reply = self._compose_reply(decision, incident_code=incident_code, location=location)
        if reply:
            await self._send_bot_reply(conversacion, reply)

        bot_status = self._resolve_bot_status(decision, incident_active=bool(incident_id))
        last_action = self._resolve_last_action(decision, incident_created=incident_created)
        ai_summary = decision.conversation_summary or self._summary_from_decision(decision)
        handoff_reason = self._resolve_handoff_reason(decision)
        category_value = decision.incident_category.value if decision.incident_category else None
        severity_value = decision.incident_severity.value if decision.incident_severity else None
        now = datetime.now(UTC)

        # Red de seguridad: no marques como faltante un dato que el borrador ya
        # tiene (p. ej. una ubicación capturada en un turno anterior). Mantiene
        # coherente el panel "Datos faltantes" aunque el LLM lo reporte de más.
        effective_missing_fields = [
            field for field in decision.missing_fields if not str(draft.get(field) or "").strip()
        ]

        await self._repo.update_chatbot_state(
            str(conversacion.id),
            {
                "bot_status": bot_status,
                "last_intent": decision.intent.value,
                "last_action": last_action,
                "requires_human_review": decision.requires_human_review,
                "handoff_reason": handoff_reason,
                "ai_summary": ai_summary,
                "classification_category": category_value,
                "classification_severity": severity_value,
                "classification_confidence": None,
                "incident_draft": draft,
                "missing_fields": effective_missing_fields,
                "suggested_reply": reply,
                "last_bot_reply": reply,
                "last_user_message_at": now,
                "last_bot_message_at": now if reply else chatbot_state.last_bot_message_at,
                "last_processed_at": now,
                "memory_snapshot": self._build_memory_snapshot(
                    recent_rows, normalized_text, reply, ai_summary
                ),
            },
        )

        await self._repo.create_evento(
            conversacion_id=conversacion.id,
            tipo_evento="CHATBOT_PROCESADO",
            payload={
                "action": last_action,
                "status": bot_status,
                "intent": decision.intent.value,
                "urgency_signal": decision.urgency_signal.value,
                "severity": severity_value,
                "category": category_value,
                "incident_id": incident_id,
                "fallback_applied": decision_result.fallback_applied,
            },
        )

    async def mark_human_takeover(self, conversacion_id: str, *, reason: str) -> None:
        await self._repo.update_chatbot_state(
            conversacion_id,
            {
                "bot_status": "HUMAN_ACTIVE",
                "last_action": "HANDOFF_TO_HUMAN",
                "handoff_reason": reason,
                "requires_human_review": True,
                "last_processed_at": datetime.now(UTC),
            },
        )

    async def mark_bot_enabled(self, conversacion_id: str) -> None:
        await self._repo.update_chatbot_state(
            conversacion_id,
            {
                "bot_status": "BOT_NEW",
                "last_action": "BOT_REACTIVATED",
                "handoff_reason": None,
                "last_processed_at": datetime.now(UTC),
            },
        )

    async def reset_for_new_cycle(self, conversacion_id: str, *, reason: str) -> None:
        reset_at = datetime.now(UTC)
        await self._repo.update_chatbot_state(
            conversacion_id,
            {
                "bot_status": "BOT_NEW",
                "last_intent": None,
                "last_action": "RESET_CONTEXT",
                "requires_human_review": False,
                "handoff_reason": None,
                "ai_summary": None,
                "classification_category": None,
                "classification_severity": None,
                "classification_confidence": None,
                "incident_draft": {},
                "missing_fields": [],
                "suggested_reply": None,
                "last_bot_reply": None,
                "memory_snapshot": {
                    "context_reset_at": reset_at.isoformat(),
                    "reason": reason,
                    "recent_messages": [],
                },
                "last_processed_at": reset_at,
            },
        )

    # --- contexto conversacional ---

    def _recent_messages_for_llm(
        self,
        recent_rows: list[dict[str, Any]],
        current_text: str,
    ) -> list[dict[str, Any]]:
        messages: list[dict[str, Any]] = []
        for row in recent_rows:
            mensaje = row["MensajeConversacion"]
            content = (mensaje.contenido or "").strip()
            if content:
                messages.append({"author": mensaje.autor_tipo, "content": content})
        # El mensaje actual se envia aparte como "MENSAJE ACTUAL"; evita duplicarlo.
        if (
            messages
            and messages[-1]["author"] == "CONTACTO"
            and messages[-1]["content"] == current_text.strip()
        ):
            messages.pop()
        return messages

    def _context_is_stale(self, chatbot_state: Any) -> bool:
        """True si el borrador/contexto guardado venció por inactividad.

        Solo aplica si hay algo que expirar (un borrador o un estado avanzado) y
        pasó más de CHATBOT_DRAFT_EXPIRY_MINUTES desde la última interacción.
        """
        minutes = max(0, int(settings.CHATBOT_DRAFT_EXPIRY_MINUTES or 0))
        if minutes <= 0:
            return False
        draft = getattr(chatbot_state, "incident_draft", None) or {}
        status = getattr(chatbot_state, "bot_status", None) or "BOT_NEW"
        if not draft and status == "BOT_NEW":
            return False
        last_at = getattr(chatbot_state, "last_user_message_at", None) or getattr(
            chatbot_state, "last_processed_at", None
        )
        if not last_at:
            return False
        if last_at.tzinfo is None:
            last_at = last_at.replace(tzinfo=UTC)
        return bool(datetime.now(UTC) - last_at >= timedelta(minutes=minutes))

    def _filter_messages_for_active_cycle(
        self,
        chatbot_state: Any,
        recent_rows: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        memory_snapshot = getattr(chatbot_state, "memory_snapshot", None) or {}
        if not isinstance(memory_snapshot, dict):
            return recent_rows

        reset_at_raw = memory_snapshot.get("context_reset_at")
        if not isinstance(reset_at_raw, str) or not reset_at_raw.strip():
            return recent_rows

        try:
            reset_at = datetime.fromisoformat(reset_at_raw.replace("Z", "+00:00"))
        except ValueError:
            return recent_rows

        filtered: list[dict[str, Any]] = []
        for row in recent_rows:
            created_at = row["MensajeConversacion"].created_at
            if created_at and created_at >= reset_at:
                filtered.append(row)
        return filtered

    def _extract_location(self, text: str, draft: dict[str, Any]) -> str | None:
        if draft.get("lugar_referencia"):
            return str(draft["lugar_referencia"])
        pattern = re.search(
            r"(?:en|cerca de|frente a|ubicacion|ubicación)\s+(?:la|el)?\s*"
            r"([A-Za-zÁÉÍÓÚáéíóúñÑ0-9\-\s]{4,80})",
            text,
            re.IGNORECASE,
        )
        if pattern:
            return pattern.group(1).strip(" .,")
        lowered = text.lower()
        for hint in SYSTEM_LOCATION_HINTS:
            if hint in lowered:
                return hint.title()
        return None

    # --- borrador e incidentes ---

    def _is_incident_related(self, decision: WhatsAppBotDecision) -> bool:
        return (
            decision.should_create_incident
            or bool(decision.missing_fields)
            or decision.intent in _INCIDENT_RELATED_INTENTS
        )

    def _build_incident_draft(
        self,
        conversacion: Any,
        text: str,
        location: str | None,
        decision: WhatsAppBotDecision,
        prev_draft: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        prev = prev_draft or {}
        # Categoría: la del turno actual si el LLM clasificó; si no, conserva la
        # previa. Severidad: escala pero no degrada. Descripción: acumula el
        # relato del ciclo sin duplicar. Todo en memoria (sin costo de tiempo).
        category = (
            decision.incident_category.value
            if decision.incident_category
            else str(prev.get("categoria") or "OTRO")
        )
        turn_severity = decision.incident_severity.value if decision.incident_severity else None
        severity = self._merge_severity(turn_severity, prev.get("severidad"))
        descripcion = self._merge_descripcion(prev.get("descripcion"), text)
        title_prefix = (
            category.replace("_", " ").title() if category != "OTRO" else "Reporte WhatsApp"
        )
        contact = conversacion.nombre_contacto or conversacion.telefono_contacto or "Contacto"
        title = f"{title_prefix}: {contact}"
        return {
            "titulo": title[:200],
            "descripcion": descripcion,
            "lugar_referencia": location,
            "categoria": category,
            "severidad": severity,
        }

    @staticmethod
    def _merge_severity(current: str | None, previous: Any) -> str:
        """Devuelve la severidad más alta entre el turno actual y el borrador."""
        candidates = [s for s in (current, previous) if isinstance(s, str) and s in _SEVERITY_ORDER]
        if not candidates:
            return "MEDIO"
        return max(candidates, key=lambda s: _SEVERITY_ORDER[s])

    @staticmethod
    def _merge_descripcion(previous: Any, new_text: str) -> str:
        """Acumula el relato del ciclo sin duplicar, recortado a 4000 chars."""
        prev = str(previous or "").strip()
        new = (new_text or "").strip()
        if not prev:
            return new[:4000]
        if not new or new.lower() in prev.lower():
            return prev[:4000]
        return f"{prev}\n{new}"[:4000]

    async def _create_incident_from_decision(
        self,
        draft: dict[str, Any],
        decision: WhatsAppBotDecision,
    ) -> tuple[str | None, str | None]:
        if (
            not settings.CHATBOT_AUTO_CREATE_INCIDENTS
            or not settings.CHATBOT_SYSTEM_USER_ID.strip()
        ):
            return None, None

        severity_value = str(draft.get("severidad") or "MEDIO")
        lugar_referencia = str(draft["lugar_referencia"]) if draft.get("lugar_referencia") else None
        latitud = draft.get("latitud")
        longitud = draft.get("longitud")
        incident = await self._incidentes.crear_incidente(
            settings.CHATBOT_SYSTEM_USER_ID.strip(),
            IncidenteCreateInput(
                titulo=str(draft["titulo"]),
                descripcion=str(draft["descripcion"]),
                severidad=NivelSeveridad(severity_value),
                categoria=str(draft["categoria"]),
                lugar_referencia=lugar_referencia,
                latitud=float(latitud) if latitud is not None else None,
                longitud=float(longitud) if longitud is not None else None,
                canal_origen=TipoCanal.MENSAJERIA,
            ),
            priorizacion_override=IncidentePriorizacionAi(
                severidad=NivelSeveridad(severity_value),
                categoria_sugerida=str(draft["categoria"]),
                confianza=None,
                justificacion=(
                    decision.conversation_summary
                    or "Registro automatico desde el bot conversacional de WhatsApp."
                )[:1200],
            ),
        )
        return incident.id, incident.codigo

    # --- mapeo de estado/respuesta ---

    def _resolve_priority(self, decision: WhatsAppBotDecision) -> str:
        if decision.incident_severity:
            return decision.incident_severity.value
        return {
            "CRITICAL": "CRITICO",
            "HIGH": "ALTO",
            "MEDIUM": "MEDIO",
            "LOW": "BAJO",
            "NONE": "BAJO",
        }.get(decision.urgency_signal.value, "BAJO")

    def _resolve_bot_status(self, decision: WhatsAppBotDecision, *, incident_active: bool) -> str:
        if decision.should_handoff:
            return "BOT_ESCALATED"
        if incident_active:
            return "BOT_INCIDENT_DRAFTED"
        if decision.missing_fields or decision.intent in {
            WhatsAppBotIntent.INCIDENT_REPORT,
            WhatsAppBotIntent.PROVIDE_DETAILS,
        }:
            return "BOT_COLLECTING"
        return "BOT_NEW"

    def _resolve_last_action(self, decision: WhatsAppBotDecision, *, incident_created: bool) -> str:
        if decision.should_handoff:
            return "HANDOFF_TO_HUMAN"
        if incident_created:
            return "CREATE_INCIDENT"
        if decision.intent == WhatsAppBotIntent.FOLLOW_UP:
            return "INFORM_STATUS"
        if decision.missing_fields:
            return "ASK_CLARIFICATION"
        if decision.intent in {
            WhatsAppBotIntent.GREETING,
            WhatsAppBotIntent.GENERAL_HELP,
            WhatsAppBotIntent.SMALL_TALK,
            WhatsAppBotIntent.NON_ACTIONABLE,
        }:
            return "GREET"
        return "REPLY"

    def _resolve_handoff_reason(self, decision: WhatsAppBotDecision) -> str | None:
        if not decision.should_handoff:
            return None
        if decision.urgency_signal.value in {"HIGH", "CRITICAL"}:
            return "Caso urgente o critico derivado a un operador."
        if decision.intent == WhatsAppBotIntent.HUMAN_REQUEST:
            return "El usuario solicito atencion humana."
        return "Derivado a un operador por incertidumbre relevante."

    def _compose_reply(
        self,
        decision: WhatsAppBotDecision,
        *,
        incident_code: str | None,
        location: str | None,
    ) -> str | None:
        if not decision.should_reply:
            return None
        return decision.reply

    @staticmethod
    def _summary_from_decision(decision: WhatsAppBotDecision) -> str:
        missing = ", ".join(decision.missing_fields) if decision.missing_fields else "ninguno"
        return (
            f"Intencion {decision.intent.value}, urgencia {decision.urgency_signal.value}. "
            f"Campos faltantes: {missing}."
        )

    async def _persist_llm_usage(
        self, conversacion: Any, result: WhatsAppBotDecisionResult
    ) -> None:
        try:
            provider_response = result.provider_response
            provider_value = (
                result.provider_used.value
                if hasattr(result.provider_used, "value")
                else str(result.provider_used)
            )
            incidente_id = str(conversacion.incidente_id) if conversacion.incidente_id else None
            await self._repo.create_chatbot_llm_usage(
                conversacion_id=str(conversacion.id),
                incidente_id=incidente_id,
                correlation_id=result.correlation_id,
                provider=provider_value,
                model=result.model_used,
                prompt_version=result.prompt_version,
                prompt_tokens=provider_response.prompt_tokens if provider_response else 0,
                completion_tokens=provider_response.completion_tokens if provider_response else 0,
                total_tokens=provider_response.total_tokens if provider_response else 0,
                latency_ms=result.latency_ms,
                fallback_applied=result.fallback_applied,
                fallback_reason=result.fallback_reason,
                raw_response={
                    "decision": result.decision.model_dump(mode="json"),
                    "provider_response": (
                        provider_response.model_dump(mode="json") if provider_response else None
                    ),
                    "normalization_events": result.normalization_events,
                },
            )
        except Exception:
            logger.exception(
                "chatbot_llm_usage_persist_failed",
                extra={"conversation_id": str(conversacion.id)},
            )

    async def _send_bot_reply(self, conversacion: Any, reply: str) -> MensajeConversacionOut | None:
        response = await self._evolution.send_text(
            chat_id=self._evolution_recipient(conversacion),
            text=reply,
        )
        key = response.get("key")
        external_id = key.get("id") if isinstance(key, dict) else response.get("id")
        mensaje = await self._repo.create_mensaje_if_missing(
            conversacion_id=conversacion.id,
            external_message_id=external_id,
            direccion="OUTBOUND",
            autor_tipo="BOT",
            contenido=reply,
            tipo_contenido="text",
            estado_entrega="sent",
            payload_raw=response,
        )
        await self._repo.update_conversacion_after_message(
            conversacion_id=conversacion.id,
            preview=reply,
        )
        await self._repo.create_evento(
            conversacion_id=conversacion.id,
            tipo_evento="BOT_REPLY_SENT",
            payload={"message_id": str(mensaje.id) if mensaje else None},
        )
        return None

    def _build_memory_snapshot(
        self,
        recent_rows: list[dict[str, Any]],
        current_text: str,
        reply: str | None,
        ai_summary: str | None = None,
    ) -> dict[str, Any]:
        messages = []
        for row in recent_rows[-6:]:
            mensaje = row["MensajeConversacion"]
            messages.append(
                {
                    "autor_tipo": mensaje.autor_tipo,
                    "contenido": mensaje.contenido,
                    "created_at": mensaje.created_at.isoformat() if mensaje.created_at else None,
                }
            )
        return {
            "recent_messages": messages,
            "last_user_message": current_text,
            "last_bot_reply": reply,
            "summary": ai_summary,
        }

    @staticmethod
    def _evolution_recipient(conversacion: Any) -> str:
        if conversacion.telefono_contacto:
            return str(conversacion.telefono_contacto)
        return str(conversacion.external_chat_id).split("@", maxsplit=1)[0]
