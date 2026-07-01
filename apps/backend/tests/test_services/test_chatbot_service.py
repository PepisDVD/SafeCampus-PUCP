from datetime import UTC, datetime, timedelta
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
from app.services.ubicacion_matcher import UbicacionMatch


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
    def __init__(self) -> None:
        self.created: list = []

    async def crear_incidente(self, reportante_id, data, priorizacion_override=None):
        self.created.append(data)
        return SimpleNamespace(id="incident-id", codigo="INC-20260628-0001")


class FakeMatcher:
    """Reemplaza al UbicacionMatcher con resultados fijos (o None)."""

    def __init__(self, match=None, coords_match=None) -> None:
        self.match = match
        self.coords_match = coords_match

    async def resolve(self, text):
        return self.match

    async def resolve_by_coords(self, latitud, longitud, **kwargs):
        return self.coords_match


def _build_service(
    decision: WhatsAppBotDecision,
    matcher_result=None,
    coords_match=None,
) -> tuple[ChatbotService, FakeRepo, FakeEvolution]:
    service = ChatbotService(db=None)
    repo = FakeRepo()
    evolution = FakeEvolution()
    service._repo = repo  # noqa: SLF001
    service._evolution = evolution  # noqa: SLF001
    service._bot_decider = FakeDecider(decision)  # noqa: SLF001
    service._incidentes = FakeIncidentes()  # noqa: SLF001
    service._ubicacion_matcher = FakeMatcher(matcher_result, coords_match)  # noqa: SLF001
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
async def test_chatbot_geolocaliza_incidente_con_ubicacion_resuelta(monkeypatch):
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
        conversation_summary="Caida en pabellon V.",
        incident_category=CategoriaIncidente.OTRO,
        incident_severity=NivelSeveridadIA.MEDIO,
        incident_location="pabellon V",
    )
    resolved = UbicacionMatch(
        id="loc-1",
        nombre="Pabellón V",
        latitud=-12.07,
        longitud=-77.08,
        score=1.0,
    )
    service, repo, evolution = _build_service(decision, matcher_result=resolved)

    await service.process_incoming_contact_message(
        _conversation(),
        "mi amigo se cayo en el pabellon V",
    )

    incidente = service._incidentes.created[-1]  # noqa: SLF001
    # Usa el nombre canónico del maestro y geolocaliza el incidente.
    assert incidente.lugar_referencia == "Pabellón V"
    assert incidente.latitud == -12.07
    assert incidente.longitud == -77.08


@pytest.mark.anyio
async def test_chatbot_no_marca_faltante_ubicacion_ya_capturada(monkeypatch):
    _enable_autocreate(monkeypatch)
    decision = WhatsAppBotDecision(
        intent=WhatsAppBotIntent.PROVIDE_DETAILS,
        urgency_signal=WhatsAppUrgencySignal.MEDIUM,
        should_reply=True,
        should_create_incident=False,
        should_handoff=False,
        requires_human_review=False,
        missing_fields=["lugar_referencia"],
        reply="¿En que lugar exacto estas?",
        conversation_summary="Reporte en curso.",
        incident_category=None,
        incident_severity=None,
        incident_location=None,
    )
    service, repo, evolution = _build_service(decision)
    # La ubicación ya fue capturada en un turno anterior (vive en el borrador).
    repo.state.incident_draft = {
        "titulo": "Reporte WhatsApp",
        "descripcion": "hay un hombre sospechoso",
        "lugar_referencia": "Pabellón A",
    }

    await service.process_incoming_contact_message(_conversation(), "tiene un cuchillo")

    # No debe volver a reportar lugar_referencia como dato faltante.
    assert "lugar_referencia" not in repo.chatbot_updates[-1]["missing_fields"]


@pytest.mark.anyio
async def test_chatbot_captura_ubicacion_gps_compartida(monkeypatch):
    _enable_autocreate(monkeypatch)
    decision = WhatsAppBotDecision(
        intent=WhatsAppBotIntent.PROVIDE_DETAILS,
        urgency_signal=WhatsAppUrgencySignal.MEDIUM,
        should_reply=True,
        should_create_incident=False,
        should_handoff=False,
        requires_human_review=False,
        missing_fields=[],
        reply="Gracias por tu ubicacion.",
        conversation_summary="",
        incident_category=None,
        incident_severity=None,
        incident_location=None,
    )
    nearby = UbicacionMatch(
        id="loc-1", nombre="Pabellón A", latitud=-12.07, longitud=-77.08, score=1.0
    )
    service, repo, evolution = _build_service(decision, coords_match=nearby)

    await service.process_incoming_contact_message(
        _conversation(),
        "📍 Ubicación compartida",
        latitud=-12.0701,
        longitud=-77.0802,
    )

    saved = repo.chatbot_updates[-1]["incident_draft"]
    # Coordenadas exactas del GPS + nombre de la ubicación maestra más cercana.
    assert saved["latitud"] == -12.0701
    assert saved["longitud"] == -77.0802
    assert saved["lugar_referencia"] == "Pabellón A"


@pytest.mark.anyio
async def test_chatbot_acumula_draft_sin_degradar_clasificacion(monkeypatch):
    _enable_autocreate(monkeypatch)
    # Turno de detalle que NO reclasifica, sobre un borrador ya clasificado.
    decision = WhatsAppBotDecision(
        intent=WhatsAppBotIntent.PROVIDE_DETAILS,
        urgency_signal=WhatsAppUrgencySignal.MEDIUM,
        should_reply=True,
        should_create_incident=False,
        should_handoff=False,
        requires_human_review=False,
        missing_fields=[],
        reply="Entendido.",
        conversation_summary="",
        incident_category=None,
        incident_severity=None,
        incident_location=None,
    )
    service, repo, evolution = _build_service(decision)
    repo.state.incident_draft = {
        "titulo": "Violencia: Contacto",
        "descripcion": "hay un hombre con cuchillo",
        "categoria": "VIOLENCIA",
        "severidad": "CRITICO",
        "lugar_referencia": "Pabellón A",
    }
    repo.state.bot_status = "BOT_INCIDENT_DRAFTED"

    await service.process_incoming_contact_message(_conversation(), "está sangrando")

    saved = repo.chatbot_updates[-1]["incident_draft"]
    assert saved["categoria"] == "VIOLENCIA"  # no se degrada a OTRO
    assert saved["severidad"] == "CRITICO"  # no se degrada a MEDIO
    assert "hay un hombre con cuchillo" in saved["descripcion"]  # conserva lo previo
    assert "está sangrando" in saved["descripcion"]  # acumula lo nuevo


@pytest.mark.anyio
async def test_chatbot_expira_draft_por_inactividad(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.CHATBOT_ENABLED", True)
    monkeypatch.setattr("app.core.config.settings.CHATBOT_DRAFT_EXPIRY_MINUTES", 30)
    decision = WhatsAppBotDecision(
        intent=WhatsAppBotIntent.GREETING,
        urgency_signal=WhatsAppUrgencySignal.NONE,
        should_reply=True,
        should_create_incident=False,
        should_handoff=False,
        requires_human_review=False,
        missing_fields=[],
        reply="Hola, ¿en qué te ayudo?",
        conversation_summary="",
        incident_category=None,
        incident_severity=None,
        incident_location=None,
    )
    service, repo, evolution = _build_service(decision)
    # Borrador viejo + última interacción hace 2 horas → contexto vencido.
    repo.state.incident_draft = {"lugar_referencia": "Pabellón A", "descripcion": "algo viejo"}
    repo.state.bot_status = "BOT_INCIDENT_DRAFTED"
    repo.state.last_user_message_at = datetime.now(UTC) - timedelta(hours=2)
    repo.state.last_processed_at = datetime.now(UTC) - timedelta(hours=2)

    await service.process_incoming_contact_message(_conversation(), "hola de nuevo")

    # El LLM debe recibir un borrador vacío: no se arrastra el contexto viejo.
    assert service._bot_decider.calls[0]["incident_draft"] == {}


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
