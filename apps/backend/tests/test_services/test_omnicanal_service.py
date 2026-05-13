from typing import Any

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
