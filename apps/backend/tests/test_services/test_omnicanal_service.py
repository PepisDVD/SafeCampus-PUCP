from typing import Any
from datetime import UTC, datetime
from types import SimpleNamespace

import pytest

from app.core.config import settings
from app.integrations.messaging.schemas import IncomingMessage
from app.services.omnicanal_service import OmnicanalService


class FakeMessagingService:
    def __init__(self, sender_phone: str, *, is_group: bool = False) -> None:
        self.sender_phone = sender_phone
        self.is_group = is_group

    def parse_incoming_webhook(
        self,
        payload: dict[str, Any],
        *,
        provider_name: str | None = None,
    ) -> IncomingMessage:
        return IncomingMessage(
            provider=provider_name or "evolution",
            sender_phone=self.sender_phone,
            is_group=self.is_group,
            message_type="text",
            text="Mensaje de prueba",
            raw_payload=payload,
        )


class FailingRepository:
    async def get_or_create_whatsapp_channel(self, **kwargs: Any) -> Any:
        raise AssertionError("No debe persistir mensajes fuera de allowlist.")

    async def create_reporte_entrante(self, **kwargs: Any) -> Any:
        raise AssertionError("No debe persistir mensajes fuera de allowlist.")


class FakeCloseEvolution:
    def __init__(self) -> None:
        self.sent: list[str] = []

    async def send_text(self, *, chat_id: str, text: str) -> dict[str, Any]:
        self.sent.append(text)
        return {"id": "close-message-id"}


class FakeCloseRepository:
    def __init__(self) -> None:
        now = datetime.now(UTC)
        self.conversation = SimpleNamespace(
            id="00000000-0000-0000-0000-000000000001",
            canal_id="00000000-0000-0000-0000-000000000002",
            external_chat_id="51999999999@s.whatsapp.net",
            telefono_contacto="51999999999",
            nombre_contacto="Contacto",
            estado="EN_ATENCION",
            modo_atencion="HUMANO",
            prioridad="MEDIO",
            operador_asignado_id=None,
            tomado_por_id=None,
            tomado_at=None,
            incidente_id=None,
            ultimo_mensaje_preview="Mensaje inicial",
            ultimo_mensaje_at=now,
            cerrado_por_id=None,
            cerrado_at=None,
            motivo_cierre=None,
            metadatos={},
            created_at=now,
            updated_at=now,
        )
        self.messages = [
            self._message("00000000-0000-0000-0000-000000000010", "CONTACTO", "Necesito ayuda")
        ]
        self.events: list[dict[str, Any]] = []
        self.closed_cycle_payload: dict[str, Any] | None = None
        self.deleted_chatbot = False

    def _message(self, message_id: str, author: str, content: str) -> SimpleNamespace:
        return SimpleNamespace(
            id=message_id,
            conversacion_id=self.conversation.id,
            ciclo_id="00000000-0000-0000-0000-000000000020",
            external_message_id=message_id,
            direccion="OUTBOUND" if author in {"SISTEMA", "BOT", "OPERADOR"} else "INBOUND",
            autor_tipo=author,
            autor_usuario_id=None,
            contenido=content,
            tipo_contenido="text",
            estado_entrega="sent",
            payload_raw={},
            created_at=datetime.now(UTC),
        )

    async def get_conversacion_detail(self, conversacion_id: str) -> dict[str, Any]:
        return {"Conversacion": self.conversation}

    async def create_mensaje_if_missing(self, **kwargs: Any) -> Any:
        message = self._message(
            "00000000-0000-0000-0000-000000000011",
            kwargs["autor_tipo"],
            kwargs["contenido"],
        )
        self.messages.append(message)
        return message

    async def update_conversacion_after_message(self, **kwargs: Any) -> Any:
        self.conversation.ultimo_mensaje_preview = kwargs["preview"]
        return self.conversation

    async def create_evento(self, **kwargs: Any) -> Any:
        event = SimpleNamespace(
            id=f"00000000-0000-0000-0000-00000000003{len(self.events)}",
            conversacion_id=self.conversation.id,
            ciclo_id="00000000-0000-0000-0000-000000000020",
            tipo_evento=kwargs["tipo_evento"],
            actor_usuario_id=kwargs.get("actor_usuario_id"),
            payload=kwargs.get("payload") or {},
            created_at=datetime.now(UTC),
        )
        self.events.append({"EventoConversacion": event})
        return event

    async def get_or_create_chatbot_state(self, conversacion_id: str) -> Any:
        return SimpleNamespace(
            bot_status="HUMAN_ACTIVE",
            last_intent="HUMAN_QUEUE",
            last_action="HANDOFF_TO_HUMAN",
            requires_human_review=True,
            handoff_reason="Prueba",
            ai_summary="Resumen",
            classification_category="OTRO",
            classification_severity="MEDIO",
            classification_confidence=0.8,
            missing_fields=[],
            incident_draft={},
            suggested_reply=None,
            last_bot_reply=None,
            last_user_message_at=None,
            last_bot_message_at=None,
            last_processed_at=datetime.now(UTC),
        )

    async def list_operadores_asignados(self, conversation_ids: list[str]) -> dict[str, list[dict[str, Any]]]:
        return {self.conversation.id: []}

    async def list_mensajes(self, conversacion_id: str, limit: int) -> list[dict[str, Any]]:
        return [{"MensajeConversacion": message} for message in self.messages]

    async def list_eventos(self, conversacion_id: str, limit: int) -> list[dict[str, Any]]:
        return self.events

    async def close_active_cycle(self, **kwargs: Any) -> Any:
        self.closed_cycle_payload = kwargs
        return SimpleNamespace(id="00000000-0000-0000-0000-000000000020")

    async def cerrar_conversacion(self, conversacion_id: str, usuario_id: str | None, motivo: str | None) -> Any:
        self.conversation.estado = "CERRADA"
        self.conversation.modo_atencion = None
        self.conversation.prioridad = None
        self.conversation.ultimo_mensaje_preview = ""
        return self.conversation

    async def delete_chatbot_state(self, conversacion_id: str) -> None:
        self.deleted_chatbot = True


@pytest.mark.anyio
async def test_registrar_whatsapp_webhook_ignora_numero_fuera_de_allowlist(monkeypatch):
    monkeypatch.setattr(settings, "WHATSAPP_ALLOWED_TEST_PHONES", "51911111111")
    service = OmnicanalService(db=None)  # type: ignore[arg-type]
    service._messaging = FakeMessagingService(sender_phone="51999999999")  # noqa: SLF001
    service._repo = FailingRepository()  # noqa: SLF001

    response = await service.registrar_whatsapp_webhook(
        payload={"event": "messages.upsert"},
        provider_name="evolution",
        webhook_secret=None,
        ip_origen="127.0.0.1",
        user_agent="pytest",
    )

    assert response.ok is True
    assert response.ignored is True
    assert response.reporte is None


@pytest.mark.anyio
async def test_registrar_whatsapp_webhook_ignora_grupos_por_defecto(monkeypatch):
    monkeypatch.setattr(settings, "WHATSAPP_ALLOWED_TEST_PHONES", "")
    monkeypatch.setattr(settings, "WHATSAPP_IGNORE_GROUP_MESSAGES", True)
    service = OmnicanalService(db=None)  # type: ignore[arg-type]
    service._messaging = FakeMessagingService(  # noqa: SLF001
        sender_phone="51999999999",
        is_group=True,
    )
    service._repo = FailingRepository()  # noqa: SLF001

    response = await service.registrar_whatsapp_webhook(
        payload={"event": "messages.upsert"},
        provider_name="evolution",
        webhook_secret=None,
        ip_origen="127.0.0.1",
        user_agent="pytest",
    )

    assert response.ok is True
    assert response.ignored is True
    assert response.reporte is None
    assert "grupo" in response.detail


def test_whatsapp_allowed_test_phones_set_normaliza_numeros(monkeypatch):
    monkeypatch.setattr(settings, "WHATSAPP_ALLOWED_TEST_PHONES", "+51 911 111 111,51922222222")

    assert settings.whatsapp_allowed_test_phones_set == {"51911111111", "51922222222"}


@pytest.mark.anyio
async def test_cerrar_conversacion_archiva_ciclo_y_limpia_chatbot():
    service = OmnicanalService(db=None)  # type: ignore[arg-type]
    fake_repo = FakeCloseRepository()
    fake_evolution = FakeCloseEvolution()
    service._repo = fake_repo  # noqa: SLF001
    service._evolution = fake_evolution  # noqa: SLF001

    response = await service.cerrar_conversacion(
        fake_repo.conversation.id,
        data=SimpleNamespace(motivo="Caso resuelto.", mensaje_cierre=None),
        usuario_id="00000000-0000-0000-0000-000000000099",
    )

    assert response.estado == "CERRADA"
    assert response.ultimo_mensaje_preview == ""
    assert fake_evolution.sent
    assert fake_repo.deleted_chatbot is True
    assert fake_repo.closed_cycle_payload is not None
    assert fake_repo.closed_cycle_payload["mensajes_snapshot"][-1]["autor_tipo"] == "SISTEMA"
    assert fake_repo.closed_cycle_payload["chatbot_snapshot"]["classification_severity"] == "MEDIO"
