import httpx
import pytest

from app.core.config import settings
from app.integrations.email.exceptions import EmailDeliveryError, EmailNotConfiguredError
from app.integrations.email.resend_client import ResendClient
from app.integrations.email.schemas import EmailMessage
from app.integrations.email.service import EmailService


def test_email_message_requires_body():
    with pytest.raises(ValueError):
        EmailMessage(to=["dev@pucp.edu.pe"], subject="Hola")


def test_resend_client_build_payload_includes_optional_fields():
    client = ResendClient(api_key="re_x", default_from="SafeCampus <no-reply@pucp.edu.pe>")
    message = EmailMessage(
        to=["a@pucp.edu.pe"],
        subject="Asunto",
        html="<p>hola</p>",
        cc=["b@pucp.edu.pe"],
        tags={"modulo": "alertas"},
    )
    payload = client._build_payload(message, "no-reply@pucp.edu.pe")
    assert payload["from"] == "no-reply@pucp.edu.pe"
    assert payload["to"] == ["a@pucp.edu.pe"]
    assert payload["cc"] == ["b@pucp.edu.pe"]
    assert payload["html"] == "<p>hola</p>"
    assert payload["tags"] == [{"name": "modulo", "value": "alertas"}]


async def test_resend_client_send_success():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["Authorization"] == "Bearer re_x"
        return httpx.Response(200, json={"id": "email-123"})

    client = ResendClient(
        api_key="re_x",
        default_from="no-reply@pucp.edu.pe",
        transport=httpx.MockTransport(handler),
    )
    result = await client.send(
        EmailMessage(to=["a@pucp.edu.pe"], subject="Hi", text="hola")
    )
    assert result.id == "email-123"
    assert result.provider == "resend"


async def test_resend_client_send_error_raises():
    transport = httpx.MockTransport(
        lambda _req: httpx.Response(422, json={"message": "Dominio no verificado"})
    )
    client = ResendClient(
        api_key="re_x", default_from="no-reply@pucp.edu.pe", transport=transport
    )
    with pytest.raises(EmailDeliveryError) as exc:
        await client.send(EmailMessage(to=["a@pucp.edu.pe"], subject="Hi", text="hola"))
    assert exc.value.status_code == 422


async def test_email_service_send_disabled_raises(monkeypatch):
    monkeypatch.setattr(settings, "EMAIL_ENABLED", False)
    service = EmailService()
    with pytest.raises(EmailNotConfiguredError):
        await service.send(EmailMessage(to=["a@pucp.edu.pe"], subject="Hi", text="hola"))


async def test_email_service_send_uses_injected_client(monkeypatch):
    monkeypatch.setattr(settings, "EMAIL_ENABLED", True)
    transport = httpx.MockTransport(lambda _req: httpx.Response(200, json={"id": "ok-1"}))
    client = ResendClient(
        api_key="re_x", default_from="no-reply@pucp.edu.pe", transport=transport
    )
    service = EmailService(client=client)
    result = await service.send(
        EmailMessage(to=["a@pucp.edu.pe"], subject="Hi", text="hola")
    )
    assert result.id == "ok-1"


def test_email_service_is_configured(monkeypatch):
    monkeypatch.setattr(settings, "RESEND_API_KEY", "re_x")
    monkeypatch.setattr(settings, "RESEND_FROM_EMAIL", "no-reply@pucp.edu.pe")
    assert EmailService().is_configured is True

    monkeypatch.setattr(settings, "RESEND_API_KEY", "")
    assert EmailService().is_configured is False
