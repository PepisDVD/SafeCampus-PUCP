import pytest

from app.integrations.llm.exceptions import LLMTimeoutError
from app.llm.schemas import (
    CategoriaIncidente,
    LLMProviderName,
    LLMProviderResponse,
    NivelSeveridadIA,
    WhatsAppBotIntent,
    WhatsAppUrgencySignal,
)
from app.services.whatsapp_bot_decision_service import WhatsAppBotDecisionService


class StubClient:
    """Cliente LLM de prueba que devuelve un texto fijo o lanza un error."""

    def __init__(self, *, text: str | None = None, error: Exception | None = None) -> None:
        self._text = text
        self._error = error

    async def invoke_classification(self, request, *, api_key):
        if self._error is not None:
            raise self._error
        return LLMProviderResponse(
            provider="openai",
            model=request.model,
            text=self._text or "",
            latency_ms=10,
            prompt_tokens=5,
            completion_tokens=7,
            total_tokens=12,
        )


def _build_service(monkeypatch, *, text=None, error=None) -> WhatsAppBotDecisionService:
    monkeypatch.setattr("app.core.config.settings.LLM_PROVIDER", "openai")
    monkeypatch.setattr("app.core.config.settings.OPENAI_API_KEY", "sk-test")
    service = WhatsAppBotDecisionService(
        provider_clients={LLMProviderName.OPENAI: StubClient(text=text, error=error)},
    )
    return service


async def _decide(service, message: str):
    return await service.decide(
        conversation_state="BOT_NEW",
        last_user_message=message,
        recent_messages=[],
        incident_exists=False,
        incident_draft={},
        correlation_id="conv-1",
    )


@pytest.mark.anyio
async def test_decision_parses_valid_greeting(monkeypatch):
    payload = (
        '{"intent":"GREETING","urgency_signal":"NONE","should_reply":true,'
        '"should_create_incident":false,"should_handoff":false,'
        '"requires_human_review":false,"missing_fields":[],'
        '"reply":"Hola","conversation_summary":"Saludo",'
        '"incident_category":null,"incident_severity":null,"incident_location":null}'
    )
    service = _build_service(monkeypatch, text=payload)
    result = await _decide(service, "Hola")

    assert result.fallback_applied is False
    assert result.decision.intent == WhatsAppBotIntent.GREETING
    assert result.decision.should_create_incident is False
    assert result.decision.incident_category is None


@pytest.mark.anyio
async def test_decision_defaults_category_when_creating_incident(monkeypatch):
    payload = (
        '{"intent":"INCIDENT_REPORT","urgency_signal":"MEDIUM","should_reply":true,'
        '"should_create_incident":true,"should_handoff":false,'
        '"requires_human_review":false,"missing_fields":[],'
        '"reply":"Listo","incident_category":"DANO_INFRAESTRUCTURA","incident_severity":null}'
    )
    service = _build_service(monkeypatch, text=payload)
    result = await _decide(service, "Rompieron una ventana del pabellon")

    decision = result.decision
    assert decision.should_create_incident is True
    assert decision.incident_category == CategoriaIncidente.DAÑO_INFRAESTRUCTURA
    # severidad se deriva de la urgencia cuando el LLM la omite
    assert decision.incident_severity == NivelSeveridadIA.MEDIO


@pytest.mark.anyio
async def test_decision_enforces_handoff_on_critical_keyword(monkeypatch):
    payload = (
        '{"intent":"INCIDENT_REPORT","urgency_signal":"LOW","should_reply":true,'
        '"should_create_incident":false,"should_handoff":false,'
        '"requires_human_review":false,"missing_fields":[],"reply":"ok"}'
    )
    service = _build_service(monkeypatch, text=payload)
    result = await _decide(service, "Hay un herido con sangre en la puerta 3")

    decision = result.decision
    assert decision.should_handoff is True
    assert decision.should_create_incident is True
    assert decision.urgency_signal == WhatsAppUrgencySignal.CRITICAL
    assert decision.requires_human_review is True


@pytest.mark.anyio
async def test_decision_fallback_on_provider_error_safe_question(monkeypatch):
    service = _build_service(monkeypatch, error=LLMTimeoutError("timeout"))
    result = await _decide(service, "Buenas tardes")

    assert result.fallback_applied is True
    assert result.decision.should_create_incident is False
    assert result.decision.should_handoff is False
    assert result.decision.should_reply is True


@pytest.mark.anyio
async def test_decision_fallback_on_provider_error_critical_keyword(monkeypatch):
    service = _build_service(monkeypatch, error=LLMTimeoutError("timeout"))
    result = await _decide(service, "Alguien tiene un cuchillo")

    assert result.fallback_applied is True
    assert result.decision.should_handoff is True
    assert result.decision.should_create_incident is True
    assert result.decision.incident_severity == NivelSeveridadIA.CRITICO
