"""Async HTTP client adapter for the Resend email API.

Documentación: https://resend.com/docs/api-reference/emails/send-email

Esta clase es un *adapter* delgado sobre la API REST de Resend. No contiene
lógica de negocio (plantillas, destinatarios institucionales, etc.); eso vive en
``EmailService`` para mantener separada la infraestructura de la orquestación.
"""

from __future__ import annotations

from typing import Any

import httpx

from app.integrations.email.exceptions import EmailDeliveryError
from app.integrations.email.schemas import EmailMessage, EmailSendResult

RESEND_API_URL = "https://api.resend.com/emails"


class ResendClient:
    provider_name = "resend"

    def __init__(
        self,
        *,
        api_key: str,
        default_from: str,
        timeout_seconds: float = 15.0,
        api_url: str = RESEND_API_URL,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._api_key = api_key
        self._default_from = default_from
        self._timeout_seconds = timeout_seconds
        self._api_url = api_url
        # Seam de pruebas: permite inyectar un httpx.MockTransport.
        self._transport = transport

    async def send(self, message: EmailMessage, *, sender: str | None = None) -> EmailSendResult:
        payload = self._build_payload(message, sender or self._default_from)
        try:
            async with httpx.AsyncClient(
                timeout=self._timeout_seconds,
                transport=self._transport,
            ) as client:
                response = await client.post(
                    self._api_url,
                    headers={
                        "Authorization": f"Bearer {self._api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
        except (httpx.TimeoutException, httpx.ConnectError) as exc:
            raise EmailDeliveryError("Tiempo de espera agotado al contactar Resend.") from exc
        except httpx.HTTPError as exc:
            raise EmailDeliveryError("Fallo de red al contactar Resend.") from exc

        if response.is_error:
            raise EmailDeliveryError(
                self._error_message(response),
                status_code=response.status_code,
            )

        body = response.json() if response.content else {}
        return EmailSendResult(
            id=body.get("id") if isinstance(body, dict) else None,
            provider=self.provider_name,
        )

    def _build_payload(self, message: EmailMessage, sender: str) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "from": sender,
            "to": list(message.to),
            "subject": message.subject,
        }
        if message.html:
            payload["html"] = message.html
        if message.text:
            payload["text"] = message.text
        if message.reply_to:
            payload["reply_to"] = message.reply_to
        if message.cc:
            payload["cc"] = list(message.cc)
        if message.bcc:
            payload["bcc"] = list(message.bcc)
        if message.tags:
            payload["tags"] = [
                {"name": name, "value": value} for name, value in message.tags.items()
            ]
        return payload

    @staticmethod
    def _error_message(response: httpx.Response) -> str:
        try:
            body = response.json()
        except ValueError:
            body = None
        if isinstance(body, dict):
            detail = body.get("message") or body.get("error")
            if isinstance(detail, str) and detail.strip():
                return f"Resend rechazó el envío: {detail.strip()}"
        return f"Resend respondió con estado {response.status_code}."
