from types import SimpleNamespace

import pytest

from app.llm.schemas import (
    CategoriaIncidente,
    LLMProviderName,
    NivelSeveridadIA,
    WhatsAppBotDecision,
    WhatsAppBotDecisionResult,
    WhatsAppBotIntent,
    WhatsAppUrgencySignal,
)
from app.services.chatbot_service import ChatbotService


class FakeRepo:
    def __init__(self) -> None:
        self.state = SimpleNamespace(
            bot_status="BOT_NEW",
            incident_draft={},
            memory_snapshot={},
            last_bot_message_at=None,
        )
        self.routing_updates: list[dict] = []
        self.chatbot_updates: list[dict] = []
        self.llm_usage_entries: list[dict] = []
        self.active_incident_associations: list[dict] = []
        self.eventos: list[dict] = []
        self.vinculated_incident_id: str | None = None

    async def get_or_create_chatbot_state(self, conversacion_id: str):
        return self.state

    async def list_mensajes(self, conversacion_id: str, limit: int):
        return []

    async def update_conversacion_chatbot_routing(self, conversacion_id: str, **kwargs):
        self.routing_updates.append(kwargs)
        return None

    async def vincular_incidente(self, conversacion_id: str, incidente_id: str):
        self.vinculated_incident_id = incidente_id
        return None

    async def replace_active_incident_association(self, **kwargs):
        self.active_incident_associations.append(kwargs)
        return None

    async def create_chatbot_llm_usage(self, **kwargs):
        self.llm_usage_entries.append(kwargs)
        return None

    async def update_chatbot_state(self, conversacion_id: str, data: dict):
        self.chatbot_updates.append(data)
        for key, value in data.items():
            setattr(self.state, key, value)
        return self.state

    async def create_evento(self, **kwargs):
        self.eventos.append(kwargs)
        return None

    async def create_mensaje_if_missing(self, **kwargs):
        return SimpleNamespace(id="bot-message-id")

    async def update_conversacion_after_message(self, **kwargs):
        return None


class FakeEvolution:
    def __init__(self) -> None:
        self.sent_messages: list[str] = []

    async def send_text(self, *, chat_id: str, text: str):
        self.sent_messages.append(text)
        return {"id": "ext-bot-message"}


class FakeDecider:
    """Reemplaza a WhatsAppBotDecisionService devolviendo una decision fija."""

    def __init__(self, decision: WhatsAppBotDecision) -> None:
        self.decision = decision
        self.calls: list[dict] = []

    async def decide(self, **kwargs) -> WhatsAppBotDecisionResult:
        self.calls.append(kwargs)
        return WhatsAppBotDecisionResult(
            decision=self.decision,
            provider_response=None,
            correlation_id=str(kwargs.get("correlation_id") or "corr"),
            model_used="gemini-2.5-flash",
            provider_used=LLMProviderName.GEMINI,
            prompt_version="PROMPT-WHATSAPP-BOT-v1.0",
            latency_ms=12,
            fallback_applied=False,
            fallback_reason=None,
            normalization_events=[],
        )


class FakeIncidentes:
    async def crear_incidente(self, reportante_id, data, priorizacion_override=None):
        return SimpleNamespace(id="incident-id", codigo="INC-20260628-0001")


def _build_service(decision: WhatsAppBotDecision) -> tuple[ChatbotService, FakeRepo, FakeEvolution]:
    service = ChatbotService(db=None)
    repo = FakeRepo()
    evolution = FakeEvolution()
    service._repo = repo  # noqa: SLF001
    service._evolution = evolution  # noqa: SLF001
    service._bot_decider = FakeDecider(decision)  # noqa: SLF001
    service._incidentes = FakeIncidentes()  # noqa: SLF001
    return service, repo, evolution


def _conversation():
    return SimpleNamespace(
        id="conversation-id",
        estado="EN_BOT",
        modo_atencion="BOT",
        external_chat_id="51999999999@s.whatsapp.net",
        telefono_contacto="51999999999",
        nombre_contacto="Contacto",
        incidente_id=None,
    )


def _enable_autocreate(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.CHATBOT_ENABLED", True)
    monkeypatch.setattr("app.core.config.settings.CHATBOT_AUTO_CREATE_INCIDENTS", True)
    monkeypatch.setattr(
        "app.core.config.settings.CHATBOT_SYSTEM_USER_ID",
        "00000000-0000-0000-0000-000000000123",
    )


@pytest.mark.anyio
async def test_chatbot_handoffs_critical_cases(monkeypatch):
    _enable_autocreate(monkeypatch)
    decision = WhatsAppBotDecision(
        intent=WhatsAppBotIntent.EMERGENCY,
        urgency_signal=WhatsAppUrgencySignal.CRITICAL,
        should_reply=True,
        should_create_incident=True,
        should_handoff=True,
        requires_human_review=True,
        missing_fields=[],
        reply="Estoy derivando esto al equipo de seguridad.",
        conversation_summary="Emergencia con arma.",
        incident_category=CategoriaIncidente.VIOLENCIA,
        incident_severity=NivelSeveridadIA.CRITICO,
        incident_location="Puerta 3",
    )
    service, repo, evolution = _build_service(decision)

    await service.process_incoming_contact_message(
        _conversation(),
        "Hay una persona con cuchillo y un herido en la puerta 3",
    )

    assert repo.routing_updates[-1]["modo_atencion"] == "HUMANO"
    assert repo.routing_updates[-1]["estado"] == "EN_COLA"
    assert repo.routing_updates[-1]["prioridad"] == "CRITICO"
    assert repo.vinculated_incident_id == "incident-id"
    assert repo.active_incident_associations[-1]["incidente_id"] == "incident-id"
    assert repo.llm_usage_entries
    assert evolution.sent_messages
    assert repo.chatbot_updates[-1]["bot_status"] == "BOT_ESCALATED"


@pytest.mark.anyio
async def test_chatbot_creates_incident_for_complete_non_critical_report(monkeypatch):
    _enable_autocreate(monkeypatch)
    decision = WhatsAppBotDecision(
        intent=WhatsAppBotIntent.INCIDENT_REPORT,
        urgency_signal=WhatsAppUrgencySignal.MEDIUM,
        should_reply=True,
        should_create_incident=True,
        should_handoff=False,
        requires_human_review=False,
        missing_fields=[],
        reply="Gracias. Registre tu reporte para seguimiento operativo.",
        conversation_summary="Robo de mochila en biblioteca.",
        incident_category=CategoriaIncidente.ROBO_HURTO,
        incident_severity=NivelSeveridadIA.MEDIO,
        incident_location="Biblioteca central",
    )
    service, repo, evolution = _build_service(decision)

    await service.process_incoming_contact_message(
        _conversation(),
        "Me acaban de robar la mochila en la biblioteca central",
    )

    assert repo.routing_updates[-1]["modo_atencion"] == "BOT"
    assert repo.routing_updates[-1]["estado"] == "EN_BOT"
    assert repo.vinculated_incident_id == "incident-id"
    assert repo.active_incident_associations[-1]["incidente_id"] == "incident-id"
    assert repo.llm_usage_entries
    assert repo.chatbot_updates[-1]["bot_status"] == "BOT_INCIDENT_DRAFTED"
    assert evolution.sent_messages


@pytest.mark.anyio
async def test_chatbot_greeting_does_not_create_or_handoff(monkeypatch):
    _enable_autocreate(monkeypatch)
    decision = WhatsAppBotDecision(
        intent=WhatsAppBotIntent.GREETING,
        urgency_signal=WhatsAppUrgencySignal.NONE,
        should_reply=True,
        should_create_incident=False,
        should_handoff=False,
        requires_human_review=False,
        missing_fields=[],
        reply="Hola, soy el asistente de SafeCampus. Cuentame que ocurrio y donde.",
        conversation_summary="Saludo inicial.",
    )
    service, repo, evolution = _build_service(decision)

    await service.process_incoming_contact_message(_conversation(), "Hola, soy David")

    assert repo.vinculated_incident_id is None
    assert not repo.active_incident_associations
    assert repo.routing_updates[-1]["modo_atencion"] == "BOT"
    assert repo.routing_updates[-1]["estado"] == "EN_BOT"
    assert repo.chatbot_updates[-1]["bot_status"] == "BOT_NEW"
    assert evolution.sent_messages == [decision.reply]


@pytest.mark.anyio
async def test_chatbot_incomplete_report_collects_without_incident(monkeypatch):
    _enable_autocreate(monkeypatch)
    decision = WhatsAppBotDecision(
        intent=WhatsAppBotIntent.INCIDENT_REPORT,
        urgency_signal=WhatsAppUrgencySignal.LOW,
        should_reply=True,
        should_create_incident=False,
        should_handoff=False,
        requires_human_review=False,
        missing_fields=["lugar_referencia"],
        reply="Gracias. Dime en que lugar del campus ocurrio.",
        conversation_summary="Robo sin ubicacion.",
    )
    service, repo, evolution = _build_service(decision)

    await service.process_incoming_contact_message(_conversation(), "Me robaron")

    assert repo.vinculated_incident_id is None
    assert repo.chatbot_updates[-1]["bot_status"] == "BOT_COLLECTING"
    assert repo.chatbot_updates[-1]["missing_fields"] == ["lugar_referencia"]
    assert evolution.sent_messages


@pytest.mark.anyio
async def test_chatbot_stays_silent_in_human_mode(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.CHATBOT_ENABLED", True)
    decision = WhatsAppBotDecision(
        intent=WhatsAppBotIntent.SMALL_TALK,
        urgency_signal=WhatsAppUrgencySignal.NONE,
    )
    service, repo, evolution = _build_service(decision)
    conversation = _conversation()
    conversation.modo_atencion = "HUMANO"

    await service.process_incoming_contact_message(conversation, "Gracias")

    assert repo.chatbot_updates[-1]["bot_status"] == "HUMAN_ACTIVE"
    assert not evolution.sent_messages
    assert not repo.routing_updates
