"""Servicio de decision conversacional para el bot de WhatsApp.

Capa unica e independiente del clasificador formal de incidentes
(`PROMPT-IA-CLAS-v1.0`). Construye el contexto de la conversacion, invoca el
prompt conversacional `PROMPT-WHATSAPP-BOT-v1.0`, normaliza la salida JSON y
aplica un fallback seguro cuando el proveedor LLM falla.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any
from uuid import uuid4

from app.core.config import settings
from app.integrations.llm import (
    GeminiClient,
    LLMAuthError,
    LLMClientError,
    LLMProviderClient,
    LLMRateLimitError,
    LLMServerError,
    LLMTimeoutError,
    OpenAIClient,
)
from app.llm.constants import (
    CATEGORIA_FALLBACK_MAP,
    CRITICAL_INDICATORS,
    VALID_CATEGORIAS,
)
from app.llm.key_manager import LLMKeyManager
from app.llm.prompt_factory import PromptFactory
from app.llm.schemas import (
    CategoriaIncidente,
    LLMInvocationRequest,
    LLMProviderName,
    NivelSeveridadIA,
    PromptTemplate,
    WhatsAppBotDecision,
    WhatsAppBotDecisionResult,
    WhatsAppBotIntent,
    WhatsAppUrgencySignal,
)
from app.llm.whatsapp_bot_context import WhatsAppBotContextLoader

logger = logging.getLogger(__name__)

CONVERSATIONAL_PROMPT_ID = "PROMPT-WHATSAPP-BOT-v1.0"

_VALID_MISSING_FIELDS = {"descripcion", "lugar_referencia"}

_FALLBACK_SAFE_REPLY = (
    "Hola, soy el asistente de SafeCampus. Para ayudarte, cuentame brevemente "
    "que ocurrio y en que lugar del campus estas."
)
_FALLBACK_EMERGENCY_REPLY = (
    "Estoy derivando esto al equipo de seguridad. Si puedes hacerlo sin exponerte, "
    "dime el lugar exacto y alejate de la zona de riesgo."
)

_URGENCY_TO_SEVERITY = {
    WhatsAppUrgencySignal.CRITICAL: NivelSeveridadIA.CRITICO,
    WhatsAppUrgencySignal.HIGH: NivelSeveridadIA.ALTO,
    WhatsAppUrgencySignal.MEDIUM: NivelSeveridadIA.MEDIO,
    WhatsAppUrgencySignal.LOW: NivelSeveridadIA.BAJO,
    WhatsAppUrgencySignal.NONE: NivelSeveridadIA.BAJO,
}


class WhatsAppBotDecisionService:
    def __init__(
        self,
        *,
        prompt_factory: PromptFactory | None = None,
        key_manager: LLMKeyManager | None = None,
        context_loader: WhatsAppBotContextLoader | None = None,
        provider_clients: dict[LLMProviderName, LLMProviderClient] | None = None,
    ) -> None:
        self._prompt_factory = prompt_factory or PromptFactory()
        self._key_manager = key_manager or LLMKeyManager()
        self._context_loader = context_loader or WhatsAppBotContextLoader()
        self._provider_clients = provider_clients or {
            LLMProviderName.OPENAI: OpenAIClient(timeout_seconds=settings.LLM_TIMEOUT_SECONDS),
            LLMProviderName.GEMINI: GeminiClient(timeout_seconds=settings.LLM_TIMEOUT_SECONDS),
        }

    async def decide(
        self,
        *,
        conversation_state: str,
        last_user_message: str,
        recent_messages: list[dict[str, Any]],
        incident_exists: bool,
        incident_draft: dict[str, Any] | None,
        correlation_id: str | None = None,
        provider: LLMProviderName | None = None,
    ) -> WhatsAppBotDecisionResult:
        correlation_id = correlation_id or str(uuid4())
        selected_provider = provider or LLMProviderName(settings.LLM_PROVIDER)
        prompt = self._prompt_factory.get_prompt_by_version(CONVERSATIONAL_PROMPT_ID)
        model = self._key_manager.get_active_model(
            selected_provider,
            prompt.metadata.modelo_objetivo,
        )
        max_tokens = prompt.metadata.max_tokens
        if selected_provider == LLMProviderName.GEMINI:
            max_tokens = max(prompt.metadata.max_tokens, settings.GEMINI_MAX_TOKENS)

        system_prompt = self._build_system_prompt(prompt)
        user_prompt = self._build_user_prompt(
            prompt,
            conversation_state=conversation_state,
            last_user_message=last_user_message,
            recent_messages=recent_messages,
            incident_exists=incident_exists,
            incident_draft=incident_draft or {},
        )
        request = LLMInvocationRequest(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            model=model,
            temperature=prompt.metadata.temperatura,
            max_tokens=max_tokens,
            correlation_id=correlation_id,
            prompt_version=prompt.metadata.id,
        )

        # Errores transitorios (sobrecarga 503, rate-limit 429, timeout) se
        # reintentan con backoff antes de degradar al heurístico, porque suelen
        # resolverse solos. Los no transitorios (auth, 4xx) no se reintentan.
        transient_errors = (LLMRateLimitError, LLMTimeoutError, LLMServerError)
        max_attempts = max(1, settings.LLM_MAX_ATTEMPTS)

        for attempt in range(1, max_attempts + 1):
            try:
                api_key = self._key_manager.get_active_key(selected_provider)
                client = self._provider_clients[selected_provider]
                provider_response = await client.invoke_classification(request, api_key=api_key)
                self._key_manager.record_usage(
                    provider=selected_provider,
                    correlation_id=correlation_id,
                    incident_id=None,
                    model=model,
                    prompt_version=prompt.metadata.id,
                    prompt_tokens=provider_response.prompt_tokens,
                    completion_tokens=provider_response.completion_tokens,
                    total_tokens=provider_response.total_tokens,
                )
                decision, events = self._normalize(provider_response.text, last_user_message)
                return WhatsAppBotDecisionResult(
                    decision=decision,
                    provider_response=provider_response,
                    correlation_id=correlation_id,
                    model_used=model,
                    provider_used=selected_provider,
                    prompt_version=prompt.metadata.id,
                    latency_ms=provider_response.latency_ms,
                    fallback_applied=False,
                    fallback_reason=None,
                    normalization_events=events,
                )
            except transient_errors as exc:
                logger.warning(
                    "whatsapp_bot_decision_provider_error (intento %s/%s): %s: %s",
                    attempt,
                    max_attempts,
                    exc.__class__.__name__,
                    exc,
                    extra={"correlation_id": correlation_id, "error": exc.__class__.__name__},
                )
                if attempt < max_attempts:
                    await asyncio.sleep(min(0.5 * 2 ** (attempt - 1), 4.0))
                    continue
                return self._fallback_result(
                    last_user_message,
                    correlation_id=correlation_id,
                    provider=selected_provider,
                    model=model,
                    prompt_version=prompt.metadata.id,
                    fallback_reason=exc.__class__.__name__,
                )
            except (LLMAuthError, LLMClientError) as exc:
                logger.warning(
                    "whatsapp_bot_decision_provider_error: %s: %s",
                    exc.__class__.__name__,
                    exc,
                    extra={"correlation_id": correlation_id, "error": exc.__class__.__name__},
                )
                return self._fallback_result(
                    last_user_message,
                    correlation_id=correlation_id,
                    provider=selected_provider,
                    model=model,
                    prompt_version=prompt.metadata.id,
                    fallback_reason=exc.__class__.__name__,
                )
            except Exception:  # noqa: BLE001 - cualquier fallo debe degradar de forma segura
                logger.exception(
                    "whatsapp_bot_decision_unexpected_error",
                    extra={"correlation_id": correlation_id},
                )
                return self._fallback_result(
                    last_user_message,
                    correlation_id=correlation_id,
                    provider=selected_provider,
                    model=model,
                    prompt_version=prompt.metadata.id,
                    fallback_reason="UNEXPECTED_ERROR",
                )

        # Salvaguarda de tipos (el bucle siempre retorna en el último intento).
        return self._fallback_result(
            last_user_message,
            correlation_id=correlation_id,
            provider=selected_provider,
            model=model,
            prompt_version=prompt.metadata.id,
            fallback_reason="UNKNOWN",
        )

    # --- construccion de prompts ---

    def _build_system_prompt(self, prompt: PromptTemplate) -> str:
        system_prompt = prompt.system_message
        additional_context = self._context_loader.load()
        if additional_context:
            system_prompt = (
                f"{system_prompt}\n\n"
                "CONTEXTO ADICIONAL VALIDADO POR SAFECAMPUS (tiene autoridad; "
                "respeta estas reglas y datos, salvo que contradigan la prioridad "
                "de derivar emergencias criticas a un humano):\n"
                f"{additional_context}"
            )
        return system_prompt

    def _build_user_prompt(
        self,
        prompt: PromptTemplate,
        *,
        conversation_state: str,
        last_user_message: str,
        recent_messages: list[dict[str, Any]],
        incident_exists: bool,
        incident_draft: dict[str, Any],
    ) -> str:
        variables = {
            "conversation_state": conversation_state or "BOT_NEW",
            "incident_exists": "true" if incident_exists else "false",
            "incident_draft": json.dumps(incident_draft or {}, ensure_ascii=False),
            "channel": "WHATSAPP",
            "recent_messages": self._format_recent_messages(recent_messages),
            "last_user_message": last_user_message.strip(),
        }
        # Sustitucion manual (no str.format) para tolerar llaves en el JSON inyectado.
        compiled = prompt.user_message_template
        for name, value in variables.items():
            compiled = compiled.replace(f"{{{name}}}", value)
        return compiled

    @staticmethod
    def _format_recent_messages(recent_messages: list[dict[str, Any]]) -> str:
        if not recent_messages:
            return "(sin mensajes previos en este ciclo)"
        lines: list[str] = []
        for message in recent_messages[-6:]:
            author = str(message.get("author") or "CONTACTO")
            content = str(message.get("content") or "").strip()
            if content:
                lines.append(f"- {author}: {content}")
        return "\n".join(lines) or "(sin mensajes previos en este ciclo)"

    # --- normalizacion ---

    def _normalize(
        self,
        payload_text: str,
        last_user_message: str,
    ) -> tuple[WhatsAppBotDecision, list[str]]:
        events: list[str] = []
        payload = self._safe_json(payload_text)
        if payload is None:
            events.append("PARSE_FAILED")
            return self._heuristic_decision(last_user_message, reason="parse_failed"), events

        intent = self._coerce_enum(
            payload.get("intent"),
            WhatsAppBotIntent,
            WhatsAppBotIntent.NON_ACTIONABLE,
            events,
            "intent",
        )
        urgency = self._coerce_enum(
            payload.get("urgency_signal"),
            WhatsAppUrgencySignal,
            WhatsAppUrgencySignal.NONE,
            events,
            "urgency",
        )
        should_reply = self._coerce_bool(payload.get("should_reply"), default=True)
        should_create_incident = self._coerce_bool(
            payload.get("should_create_incident"), default=False
        )
        should_handoff = self._coerce_bool(payload.get("should_handoff"), default=False)
        requires_human_review = self._coerce_bool(
            payload.get("requires_human_review"), default=False
        )
        missing_fields = self._coerce_missing_fields(payload.get("missing_fields"))
        reply = self._coerce_text(payload.get("reply"))
        conversation_summary = self._coerce_text(payload.get("conversation_summary"))
        incident_category = self._coerce_categoria(payload.get("incident_category"), events)
        incident_severity = self._coerce_enum_optional(
            payload.get("incident_severity"), NivelSeveridadIA
        )
        incident_location = self._coerce_text(payload.get("incident_location"))

        # Guard de seguridad: indicadores criticos siempre derivan a humano.
        if self._has_critical_signal(last_user_message):
            if urgency not in {WhatsAppUrgencySignal.HIGH, WhatsAppUrgencySignal.CRITICAL}:
                urgency = WhatsAppUrgencySignal.CRITICAL
                events.append("critical_signal_enforced")
            should_handoff = True
            should_create_incident = True
            requires_human_review = True

        if should_handoff:
            requires_human_review = True

        if should_create_incident:
            if incident_category is None:
                incident_category = CategoriaIncidente.OTRO
                events.append("incident_category_defaulted")
            if incident_severity is None:
                incident_severity = _URGENCY_TO_SEVERITY.get(urgency, NivelSeveridadIA.MEDIO)
                events.append("incident_severity_defaulted")
        else:
            incident_category = None
            incident_severity = None

        if should_reply and not reply:
            reply = _FALLBACK_SAFE_REPLY
            events.append("reply_defaulted")

        decision = WhatsAppBotDecision(
            intent=intent,
            urgency_signal=urgency,
            should_reply=should_reply,
            should_create_incident=should_create_incident,
            should_handoff=should_handoff,
            requires_human_review=requires_human_review,
            missing_fields=missing_fields,
            reply=reply if should_reply else None,
            conversation_summary=conversation_summary,
            incident_category=incident_category,
            incident_severity=incident_severity,
            incident_location=incident_location,
        )
        return decision, events

    def _fallback_result(
        self,
        last_user_message: str,
        *,
        correlation_id: str,
        provider: LLMProviderName,
        model: str,
        prompt_version: str | None,
        fallback_reason: str,
    ) -> WhatsAppBotDecisionResult:
        decision = self._heuristic_decision(last_user_message, reason=fallback_reason)
        return WhatsAppBotDecisionResult(
            decision=decision,
            provider_response=None,
            correlation_id=correlation_id,
            model_used=model,
            provider_used=provider,
            prompt_version=prompt_version,
            latency_ms=None,
            fallback_applied=True,
            fallback_reason=fallback_reason,
            normalization_events=["fallback"],
        )

    def _heuristic_decision(self, last_user_message: str, *, reason: str) -> WhatsAppBotDecision:
        """Decision segura cuando no se puede confiar en la salida del LLM."""
        if self._has_critical_signal(last_user_message):
            return WhatsAppBotDecision(
                intent=WhatsAppBotIntent.EMERGENCY,
                urgency_signal=WhatsAppUrgencySignal.CRITICAL,
                should_reply=True,
                should_create_incident=True,
                should_handoff=True,
                requires_human_review=True,
                missing_fields=[],
                reply=_FALLBACK_EMERGENCY_REPLY,
                conversation_summary="Fallback: senal critica detectada por palabras clave.",
                incident_category=CategoriaIncidente.OTRO,
                incident_severity=NivelSeveridadIA.CRITICO,
                incident_location=None,
            )
        return WhatsAppBotDecision(
            intent=WhatsAppBotIntent.GENERAL_HELP,
            urgency_signal=WhatsAppUrgencySignal.NONE,
            should_reply=True,
            should_create_incident=False,
            should_handoff=False,
            requires_human_review=False,
            missing_fields=["descripcion", "lugar_referencia"],
            reply=_FALLBACK_SAFE_REPLY,
            conversation_summary=f"Fallback conversacional ({reason}).",
            incident_category=None,
            incident_severity=None,
            incident_location=None,
        )

    # --- helpers de coercion ---

    @staticmethod
    def _safe_json(payload_text: str) -> dict[str, Any] | None:
        text = (payload_text or "").strip()
        if text.startswith("```") and text.endswith("```"):
            lines = text.splitlines()
            text = "\n".join(lines[1:-1]).strip()
        try:
            payload = json.loads(text)
        except (json.JSONDecodeError, TypeError):
            return None
        return payload if isinstance(payload, dict) else None

    @staticmethod
    def _coerce_enum(raw: Any, enum_cls: Any, default: Any, events: list[str], label: str) -> Any:
        if isinstance(raw, str):
            normalized = raw.strip().upper()
            if normalized in enum_cls.__members__:
                return enum_cls[normalized]
            try:
                return enum_cls(normalized)
            except ValueError:
                pass
        events.append(f"{label}_defaulted")
        return default

    @staticmethod
    def _coerce_enum_optional(raw: Any, enum_cls: Any) -> Any | None:
        if isinstance(raw, str):
            normalized = raw.strip().upper()
            if not normalized or normalized in {"NULL", "NONE"}:
                return None
            try:
                return enum_cls(normalized)
            except ValueError:
                return None
        return None

    @staticmethod
    def _coerce_categoria(raw: Any, events: list[str]) -> CategoriaIncidente | None:
        if not isinstance(raw, str):
            return None
        normalized = raw.strip().upper().replace("DANO_", "DAÑO_")
        if not normalized or normalized in {"NULL", "NONE"}:
            return None
        if normalized in VALID_CATEGORIAS:
            return CategoriaIncidente(normalized)
        mapped = CATEGORIA_FALLBACK_MAP.get(normalized)
        if mapped:
            events.append("incident_category_normalized")
            return CategoriaIncidente(mapped)
        events.append("incident_category_unmapped")
        return CategoriaIncidente.OTRO

    @staticmethod
    def _coerce_bool(raw: Any, *, default: bool) -> bool:
        if isinstance(raw, bool):
            return raw
        if isinstance(raw, str):
            lowered = raw.strip().lower()
            if lowered in {"true", "si", "yes", "1"}:
                return True
            if lowered in {"false", "no", "0"}:
                return False
        return default

    @staticmethod
    def _coerce_missing_fields(raw: Any) -> list[str]:
        if not isinstance(raw, list):
            return []
        result: list[str] = []
        for item in raw:
            value = str(item).strip().lower()
            if value in _VALID_MISSING_FIELDS and value not in result:
                result.append(value)
        return result

    @staticmethod
    def _coerce_text(raw: Any) -> str | None:
        if raw is None:
            return None
        text = str(raw).strip()
        if not text or text.lower() in {"null", "none"}:
            return None
        return text

    @staticmethod
    def _has_critical_signal(text: str) -> bool:
        lowered = (text or "").lower()
        return any(indicator in lowered for indicator in CRITICAL_INDICATORS)
