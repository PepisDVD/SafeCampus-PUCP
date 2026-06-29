from datetime import UTC, datetime
from typing import Any

from app.api.v1.omnicanal import get_service
from app.main import app
from app.schemas.omnicanal import ReporteEntranteCreated, WhatsAppWebhookResponse


class FakeOmnicanalService:
    async def registrar_whatsapp_webhook(
        self,
        *,
        payload: dict[str, Any],
        provider_name: str | None,
        webhook_secret: str | None,
        ip_origen: str | None,
        user_agent: str | None,
        background_tasks: Any | None = None,
    ) -> WhatsAppWebhookResponse:
        assert payload["event"] == "messages.upsert"
        assert provider_name == "evolution"
        return WhatsAppWebhookResponse(
            reporte=ReporteEntranteCreated(
                id="10000000-0000-0000-0000-000000000001",
                canal_id="20000000-0000-0000-0000-000000000001",
                provider="evolution",
                external_message_id="ABC123",
                sender_phone="51999999999",
                message_type="text",
                estado="NORMALIZADO",
                created_at=datetime(2026, 5, 12, tzinfo=UTC),
            )
        )


def test_recibir_webhook_whatsapp(client):
    app.dependency_overrides[get_service] = lambda: FakeOmnicanalService()
    try:
        response = client.post(
            "/api/v1/omnicanal/webhooks/whatsapp",
            headers={"x-safecampus-provider": "evolution"},
            json={
                "event": "messages.upsert",
                "instance": "safecampus-dev",
                "data": {
                    "key": {
                        "id": "ABC123",
                        "remoteJid": "51999999999@s.whatsapp.net",
                        "fromMe": False,
                    },
                    "pushName": "Dev Test",
                    "message": {"conversation": "Necesito ayuda en campus"},
                },
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["ok"] is True
        assert payload["ignored"] is False
        assert payload["reporte"]["provider"] == "evolution"
        assert payload["reporte"]["external_message_id"] == "ABC123"
        assert payload["reporte"]["sender_phone"] == "51999999999"
    finally:
        app.dependency_overrides.pop(get_service, None)
