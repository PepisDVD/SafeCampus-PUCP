"""Email/notification service built on top of the Resend provider.

Esta es la base lista para que el módulo de notificaciones empiece a enviar
correos (alertas, confirmaciones, etc.). El servicio:

  - Centraliza la configuración (API key, remitente por defecto, flag de habilitado).
  - Expone un ``send`` de alto nivel desacoplado del proveedor concreto.
  - Falla de forma explícita cuando la integración no está configurada, para que
    el llamador decida si degradar silenciosamente o propagar el error.
"""

from __future__ import annotations

import logging

from app.core.config import settings
from app.integrations.email.exceptions import EmailNotConfiguredError
from app.integrations.email.resend_client import ResendClient
from app.integrations.email.schemas import EmailMessage, EmailSendResult

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self, client: ResendClient | None = None) -> None:
        self._client = client
        self._enabled = settings.EMAIL_ENABLED

    @property
    def is_configured(self) -> bool:
        return bool(settings.RESEND_API_KEY and settings.RESEND_FROM_EMAIL)

    @property
    def is_enabled(self) -> bool:
        return self._enabled and self.is_configured

    def _get_client(self) -> ResendClient:
        if self._client is not None:
            return self._client
        if not self.is_configured:
            raise EmailNotConfiguredError(
                "Resend no está configurado (falta RESEND_API_KEY o RESEND_FROM_EMAIL)."
            )
        sender = settings.RESEND_FROM_EMAIL
        if settings.RESEND_FROM_NAME:
            sender = f"{settings.RESEND_FROM_NAME} <{settings.RESEND_FROM_EMAIL}>"
        self._client = ResendClient(
            api_key=settings.RESEND_API_KEY,
            default_from=sender,
        )
        return self._client

    async def send(self, message: EmailMessage) -> EmailSendResult:
        """Envía un correo. Lanza ``EmailNotConfiguredError`` si no está habilitado."""
        if not self._enabled:
            raise EmailNotConfiguredError("El envío de correos está deshabilitado (EMAIL_ENABLED).")
        client = self._get_client()
        result = await client.send(message)
        logger.info(
            "Correo enviado vía Resend a %s destinatario(s) (id=%s).",
            len(message.to),
            result.id,
        )
        return result
