from types import SimpleNamespace

import pytest

from app.llm.schemas import CategoriaIncidente, NivelSeveridadIA
from app.services.chatbot_service import ChatbotService


class FakeRepo:
    def __init__(self) -> None:
        self.state = SimpleNamespace(bot_status="BOT_NEW", incident_draft={})
        self.routing_updates: list[dict] = []
        self.chatbot_updates: list[dict] = []
        self.llm_usage_entries: list[dict] = []
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

    async def create_chatbot_llm_usage(self, **kwargs):
        self.llm_usage_entries.append(kwargs)
        return None

    async def update_chatbot_state(self, conversacion_id: str, data: dict):
        self.chatbot_updates.append(data)
        for key, value in data.items():
            setattr(self.state, key, value)
        return self.state

    async def create_evento(self, **kwargs):
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


class FakeLLM:
    def __init__(self, *, severity: str, category: str, requires_human_review: bool = False):
        self.severity = NivelSeveridadIA(severity)
        self.category = CategoriaIncidente(category)
        self.requires_human_review = requires_human_review

    async def classify_whatsapp_message(self, **kwargs):
        return SimpleNamespace(
            final=SimpleNamespace(
                severidad=self.severity,
                categoria=self.category,
                requires_human_review=self.requires_human_review,
                confidence_score=0.91,
                razonamiento_breve="Clasificacion de prueba",
            )
        )


class FakeIncidentes:
    async def crear_incidente(self, reportante_id, data, priorizacion_override=None):
        return SimpleNamespace(id="incident-id", codigo="INC-20260513-0001")


@pytest.mark.anyio
async def test_chatbot_handoffs_critical_cases(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.CHATBOT_ENABLED", True)
    monkeypatch.setattr("app.core.config.settings.CHATBOT_AUTO_CREATE_INCIDENTS", True)
    monkeypatch.setattr(
        "app.core.config.settings.CHATBOT_SYSTEM_USER_ID",
        "00000000-0000-0000-0000-000000000123",
    )

    service = ChatbotService(db=None)
    service._repo = FakeRepo()  # noqa: SLF001
    service._evolution = FakeEvolution()  # noqa: SLF001
    service._llm = FakeLLM(severity="CRITICO", category="VIOLENCIA", requires_human_review=True)  # noqa: SLF001
    service._incidentes = FakeIncidentes()  # noqa: SLF001

    conversation = SimpleNamespace(
        id="conversation-id",
        estado="EN_BOT",
        modo_atencion="BOT",
        external_chat_id="51999999999@s.whatsapp.net",
        telefono_contacto="51999999999",
        nombre_contacto="Contacto",
        incidente_id=None,
    )

    await service.process_incoming_contact_message(
        conversation,
        "Hay una pelea con cuchillo y un herido en la puerta 3",
    )

    assert service._repo.routing_updates[-1]["modo_atencion"] == "HUMANO"  # noqa: SLF001
    assert service._repo.routing_updates[-1]["estado"] == "EN_COLA"  # noqa: SLF001
    assert service._repo.vinculated_incident_id == "incident-id"  # noqa: SLF001
    assert service._repo.llm_usage_entries  # noqa: SLF001
    assert service._evolution.sent_messages  # noqa: SLF001
    assert service._repo.chatbot_updates[-1]["bot_status"] == "BOT_ESCALATED"  # noqa: SLF001


@pytest.mark.anyio
async def test_chatbot_creates_incident_for_complete_non_critical_report(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.CHATBOT_ENABLED", True)
    monkeypatch.setattr("app.core.config.settings.CHATBOT_AUTO_CREATE_INCIDENTS", True)
    monkeypatch.setattr(
        "app.core.config.settings.CHATBOT_SYSTEM_USER_ID",
        "00000000-0000-0000-0000-000000000123",
    )

    service = ChatbotService(db=None)
    service._repo = FakeRepo()  # noqa: SLF001
    service._evolution = FakeEvolution()  # noqa: SLF001
    service._llm = FakeLLM(severity="MEDIO", category="ROBO_HURTO")  # noqa: SLF001
    service._incidentes = FakeIncidentes()  # noqa: SLF001

    conversation = SimpleNamespace(
        id="conversation-id",
        estado="EN_BOT",
        modo_atencion="BOT",
        external_chat_id="51999999999@s.whatsapp.net",
        telefono_contacto="51999999999",
        nombre_contacto="Contacto",
        incidente_id=None,
    )

    await service.process_incoming_contact_message(
        conversation,
        "Me acaban de robar la mochila en la biblioteca central",
    )

    assert service._repo.routing_updates[-1]["modo_atencion"] == "BOT"  # noqa: SLF001
    assert service._repo.vinculated_incident_id == "incident-id"  # noqa: SLF001
    assert service._repo.llm_usage_entries  # noqa: SLF001
    assert service._repo.chatbot_updates[-1]["bot_status"] == "BOT_INCIDENT_DRAFTED"  # noqa: SLF001
    assert service._evolution.sent_messages  # noqa: SLF001