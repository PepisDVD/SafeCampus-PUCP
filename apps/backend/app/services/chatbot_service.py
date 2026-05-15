"""Operational chatbot orchestration for WhatsApp conversations."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from app.core.config import settings
from app.core.constants import NivelSeveridad, TipoCanal
from app.integrations.messaging.evolution_client import EvolutionApiClient
from app.repositories.omnicanal_repository import OmnicanalRepository
from app.schemas.incidente import IncidenteCreateInput, IncidentePriorizacionAi
from app.schemas.omnicanal import ConversacionDetail, MensajeConversacionOut
from app.services.incidente_service import IncidenteService
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)

GREETING_KEYWORDS = {"hola", "buenas", "buenos dias", "buenas tardes", "buenas noches"}
FOLLOW_UP_KEYWORDS = {"estado", "seguimiento", "avance", "caso", "incidente"}
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


@dataclass
class ChatbotDecision:
    status: str
    action: str
    reply: str | None
    handoff_reason: str | None
    requires_human_review: bool
    missing_fields: list[str]
    intent: str
    ai_summary: str
    should_create_incident: bool
    should_handoff: bool


class ChatbotService:
    def __init__(self, db: Any) -> None:
        self._repo = OmnicanalRepository(db)
        self._evolution = EvolutionApiClient()
        self._llm = LLMService(db=db)
        self._incidentes = IncidenteService(db)

    async def process_incoming_contact_message(
        self,
        conversacion: Any,
        incoming_message: str,
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

        recent_rows = await self._repo.list_mensajes(str(conversacion.id), limit=12)
        recent_rows = self._filter_messages_for_active_cycle(chatbot_state, recent_rows)
        normalized_text = incoming_message.strip()
        location = self._extract_location(normalized_text, chatbot_state.incident_draft or {})
        classification = await self._llm.classify_whatsapp_message(
            descripcion=self._compose_classification_input(recent_rows, normalized_text),
            ubicacion=location or "No especificada",
            contexto_adicional=f"Conversacion WhatsApp {conversacion.external_chat_id}",
        )
        final = classification.final
        provider_response = getattr(classification, "provider_response", None)
        try:
            correlation_id = getattr(final, "correlation_id", str(conversacion.id))
            provider_used = getattr(final, "provider_used", None)
            provider_value = (
                provider_used.value
                if hasattr(provider_used, "value")
                else str(provider_used) if provider_used else settings.LLM_PROVIDER
            )
            model_used = getattr(final, "model_used", "unknown")
            prompt_version = getattr(final, "version_prompt", None)
            latency_ms = getattr(final, "latency_ms", None)
            fallback_applied = bool(getattr(final, "fallback_applied", False))
            fallback_reason = getattr(final, "fallback_reason", None)
            normalized_payload = (
                classification.normalized.model_dump(mode="json")
                if hasattr(classification, "normalized")
                else None
            )
            final_payload = final.model_dump(mode="json") if hasattr(final, "model_dump") else {}
            provider_payload = (
                provider_response.model_dump(mode="json") if provider_response and hasattr(provider_response, "model_dump") else None
            )
            await self._repo.create_chatbot_llm_usage(
                conversacion_id=str(conversacion.id),
                incidente_id=(str(conversacion.incidente_id) if conversacion.incidente_id else None),
                correlation_id=correlation_id,
                provider=provider_value,
                model=model_used,
                prompt_version=prompt_version,
                prompt_tokens=provider_response.prompt_tokens if provider_response else 0,
                completion_tokens=provider_response.completion_tokens if provider_response else 0,
                total_tokens=provider_response.total_tokens if provider_response else 0,
                latency_ms=latency_ms,
                fallback_applied=fallback_applied,
                fallback_reason=fallback_reason,
                raw_response={
                    "normalized": normalized_payload,
                    "final": final_payload,
                    "provider_response": provider_payload,
                },
            )
        except Exception:
            logger.exception("chatbot_llm_usage_persist_failed", extra={"conversation_id": str(conversacion.id)})

        draft = self._build_incident_draft(conversacion, normalized_text, location, final)
        intent = self._detect_intent(normalized_text, bool(conversacion.incidente_id), chatbot_state.bot_status)
        missing_fields = self._missing_fields(draft, final.severidad)
        decision = self._decide(
            conversacion=conversacion,
            intent=intent,
            severity=final.severidad.value,
            requires_human_review=final.requires_human_review,
            missing_fields=missing_fields,
            incident_exists=bool(conversacion.incidente_id),
            normalized_text=normalized_text,
            incident_code=None,
        )

        incident_id = str(conversacion.incidente_id) if conversacion.incidente_id else None
        incident_code: str | None = None
        if decision.should_create_incident and not incident_id:
            incident_id, incident_code = await self._create_incident_from_chatbot(draft, final)
            if incident_id:
                await self._repo.vincular_incidente(str(conversacion.id), incident_id)

        if decision.should_handoff:
            await self._repo.update_conversacion_chatbot_routing(
                str(conversacion.id),
                prioridad=final.severidad.value,
                estado="EN_COLA",
                modo_atencion="HUMANO",
                incidente_id=incident_id,
            )
        else:
            await self._repo.update_conversacion_chatbot_routing(
                str(conversacion.id),
                prioridad=final.severidad.value,
                estado="EN_BOT",
                modo_atencion="BOT",
                incidente_id=incident_id,
            )

        reply = self._compose_reply(
            decision=decision,
            severity=final.severidad.value,
            category=final.categoria.value,
            incident_code=incident_code,
            location=location,
        )

        if reply:
            await self._send_bot_reply(conversacion, reply)

        await self._repo.update_chatbot_state(
            str(conversacion.id),
            {
                "bot_status": decision.status,
                "last_intent": decision.intent,
                "last_action": decision.action,
                "requires_human_review": decision.requires_human_review,
                "handoff_reason": decision.handoff_reason,
                "ai_summary": decision.ai_summary,
                "classification_category": final.categoria.value,
                "classification_severity": final.severidad.value,
                "classification_confidence": final.confidence_score,
                "incident_draft": draft,
                "missing_fields": decision.missing_fields,
                "suggested_reply": reply,
                "last_bot_reply": reply,
                "last_user_message_at": datetime.now(UTC),
                "last_bot_message_at": datetime.now(UTC) if reply else chatbot_state.last_bot_message_at,
                "last_processed_at": datetime.now(UTC),
                "memory_snapshot": self._build_memory_snapshot(recent_rows, normalized_text, reply),
            },
        )

        await self._repo.create_evento(
            conversacion_id=conversacion.id,
            tipo_evento="CHATBOT_PROCESADO",
            payload={
                "action": decision.action,
                "status": decision.status,
                "severity": final.severidad.value,
                "category": final.categoria.value,
                "incident_id": incident_id,
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

    def _compose_classification_input(self, recent_rows: list[dict[str, Any]], current_text: str) -> str:
        contact_messages = [
            row["MensajeConversacion"].contenido or ""
            for row in recent_rows
            if row["MensajeConversacion"].autor_tipo == "CONTACTO"
        ]
        last_messages = [message.strip() for message in contact_messages[-4:] if message.strip()]
        if current_text.strip() not in last_messages:
            last_messages.append(current_text.strip())
        return "\n".join(last_messages[-4:])

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

    def _detect_intent(self, text: str, incident_exists: bool, bot_status: str) -> str:
        lowered = text.lower().strip()
        if any(keyword in lowered for keyword in GREETING_KEYWORDS) and len(lowered) <= 24:
            return "GREETING"
        if incident_exists and any(keyword in lowered for keyword in FOLLOW_UP_KEYWORDS):
            return "FOLLOW_UP"
        if bot_status == "BOT_COLLECTING":
            return "PROVIDE_DETAILS"
        return "REPORT_INCIDENT"

    def _extract_location(self, text: str, draft: dict[str, Any]) -> str | None:
        if draft.get("lugar_referencia"):
            return str(draft["lugar_referencia"])
        pattern = re.search(
            r"(?:en|cerca de|frente a|ubicacion|ubicación)\s+(?:la|el)?\s*([A-Za-zÁÉÍÓÚáéíóúñÑ0-9\-\s]{4,80})",
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

    def _build_incident_draft(
        self,
        conversacion: Any,
        text: str,
        location: str | None,
        final: Any,
    ) -> dict[str, Any]:
        category = final.categoria.value
        severity = final.severidad.value
        title_prefix = category.replace("_", " ").title() if category != "OTRO" else "Reporte WhatsApp"
        title = f"{title_prefix}: {conversacion.nombre_contacto or conversacion.telefono_contacto or 'Contacto'}"
        return {
            "titulo": title[:200],
            "descripcion": text[:4000],
            "lugar_referencia": location,
            "categoria": category,
            "severidad": severity,
            "confidence_score": final.confidence_score,
        }

    def _missing_fields(self, draft: dict[str, Any], severity: str) -> list[str]:
        missing: list[str] = []
        if not draft.get("descripcion") or len(str(draft["descripcion"]).strip()) < 12:
            missing.append("descripcion")
        if severity not in {"CRITICO", "ALTO"} and not draft.get("lugar_referencia"):
            missing.append("lugar_referencia")
        return missing

    def _decide(
        self,
        *,
        conversacion: Any,
        intent: str,
        severity: str,
        requires_human_review: bool,
        missing_fields: list[str],
        incident_exists: bool,
        normalized_text: str,
        incident_code: str | None,
    ) -> ChatbotDecision:
        ai_summary = (
            f"Clasificacion IA: severidad {severity}. "
            f"Campos faltantes: {', '.join(missing_fields) if missing_fields else 'ninguno'}."
        )
        if incident_exists and intent == "FOLLOW_UP":
            return ChatbotDecision(
                status="BOT_INCIDENT_DRAFTED",
                action="INFORM_STATUS",
                reply=None,
                handoff_reason=None,
                requires_human_review=requires_human_review,
                missing_fields=[],
                intent=intent,
                ai_summary=ai_summary,
                should_create_incident=False,
                should_handoff=False,
            )

        if severity in {"CRITICO", "ALTO"} or requires_human_review:
            return ChatbotDecision(
                status="BOT_ESCALATED",
                action="HANDOFF_TO_HUMAN",
                reply=None,
                handoff_reason="Caso critico, urgente o ambiguo derivado a operador.",
                requires_human_review=True,
                missing_fields=[],
                intent=intent,
                ai_summary=ai_summary,
                should_create_incident=True,
                should_handoff=True,
            )

        if intent == "GREETING" and not normalized_text.strip().endswith("?"):
            return ChatbotDecision(
                status="BOT_COLLECTING",
                action="ASK_INCIDENT_DETAILS",
                reply=None,
                handoff_reason=None,
                requires_human_review=False,
                missing_fields=["descripcion", "lugar_referencia"],
                intent=intent,
                ai_summary=ai_summary,
                should_create_incident=False,
                should_handoff=False,
            )

        if missing_fields:
            return ChatbotDecision(
                status="BOT_COLLECTING",
                action="ASK_CLARIFICATION",
                reply=None,
                handoff_reason=None,
                requires_human_review=False,
                missing_fields=missing_fields,
                intent=intent,
                ai_summary=ai_summary,
                should_create_incident=False,
                should_handoff=False,
            )

        return ChatbotDecision(
            status="BOT_INCIDENT_DRAFTED",
            action="CREATE_INCIDENT",
            reply=None,
            handoff_reason=None,
            requires_human_review=False,
            missing_fields=[],
            intent=intent,
            ai_summary=ai_summary,
            should_create_incident=not incident_exists,
            should_handoff=False,
        )

    def _compose_reply(
        self,
        *,
        decision: ChatbotDecision,
        severity: str,
        category: str,
        incident_code: str | None,
        location: str | None,
    ) -> str | None:
        if decision.action == "HANDOFF_TO_HUMAN":
            return (
                "Recibimos tu reporte y ya fue derivado al equipo de seguridad para atención inmediata. "
                "Si puedes hacerlo sin exponerte, comparte referencias adicionales del lugar."
            )
        if decision.action == "ASK_INCIDENT_DETAILS":
            return (
                "Hola. Soy el asistente inicial de SafeCampus. Por favor indica que ocurrió y en qué lugar del campus sucede o sucedió."
            )
        if decision.action == "ASK_CLARIFICATION":
            if "lugar_referencia" in decision.missing_fields:
                return "Gracias. Para registrar bien el caso, indícame el lugar exacto o una referencia dentro del campus."
            return "Gracias. ¿Podrías darme un poco más de detalle de lo ocurrido para continuar con el registro?"
        if decision.action == "INFORM_STATUS" and incident_code:
            return f"Tu caso sigue registrado con el código {incident_code}. Un operador lo revisará desde la bandeja operativa."
        if decision.action == "CREATE_INCIDENT" and incident_code:
            location_text = f" en {location}" if location else ""
            return (
                f"Gracias. Registré tu reporte como incidente {incident_code}{location_text}. "
                f"Clasificación preliminar: {category.replace('_', ' ').lower()} con severidad {severity.lower()}."
            )
        if decision.action == "CREATE_INCIDENT":
            return "Gracias. Registré tu reporte y lo dejé listo para seguimiento operativo desde SafeCampus."
        return None

    async def _create_incident_from_chatbot(self, draft: dict[str, Any], final: Any) -> tuple[str | None, str | None]:
        if not settings.CHATBOT_AUTO_CREATE_INCIDENTS or not settings.CHATBOT_SYSTEM_USER_ID.strip():
            return None, None

        incident = await self._incidentes.crear_incidente(
            settings.CHATBOT_SYSTEM_USER_ID.strip(),
            IncidenteCreateInput(
                titulo=str(draft["titulo"]),
                descripcion=str(draft["descripcion"]),
                severidad=NivelSeveridad(str(draft["severidad"])),
                categoria=str(draft["categoria"]),
                lugar_referencia=(str(draft["lugar_referencia"]) if draft.get("lugar_referencia") else None),
                canal_origen=TipoCanal.MENSAJERIA,
            ),
            priorizacion_override=IncidentePriorizacionAi(
                severidad=NivelSeveridad(final.severidad.value),
                categoria_sugerida=final.categoria.value,
                confianza=final.confidence_score,
                justificacion=final.razonamiento_breve,
            ),
        )
        return incident.id, incident.codigo

    async def _send_bot_reply(self, conversacion: Any, reply: str) -> MensajeConversacionOut | None:
        response = await self._evolution.send_text(
            chat_id=self._evolution_recipient(conversacion),
            text=reply,
        )
        external_id = response.get("key", {}).get("id") if isinstance(response.get("key"), dict) else response.get("id")
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
        }

    @staticmethod
    def _evolution_recipient(conversacion: Any) -> str:
        if conversacion.telefono_contacto:
            return conversacion.telefono_contacto
        return str(conversacion.external_chat_id).split("@", maxsplit=1)[0]