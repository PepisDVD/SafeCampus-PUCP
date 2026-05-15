"""Provider selection and normalization for messaging integrations."""

from typing import Any

from fastapi import HTTPException, status

from app.core.config import settings
from app.integrations.messaging.provider import MessagingProvider
from app.integrations.messaging.providers.evolution import EvolutionWhatsAppProvider
from app.integrations.messaging.providers.meta import MetaWhatsAppProvider
from app.integrations.messaging.schemas import IncomingMessage


class MessagingService:
    def __init__(self) -> None:
        self._providers: dict[str, MessagingProvider] = {
            EvolutionWhatsAppProvider.name: EvolutionWhatsAppProvider(),
            MetaWhatsAppProvider.name: MetaWhatsAppProvider(),
        }

    def parse_incoming_webhook(
        self,
        payload: dict[str, Any],
        *,
        provider_name: str | None = None,
    ) -> IncomingMessage:
        provider = self._get_provider(provider_name or settings.WHATSAPP_PROVIDER)
        try:
            return provider.parse_incoming_webhook(payload)
        except NotImplementedError as exc:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail=str(exc),
            ) from exc

    def _get_provider(self, provider_name: str) -> MessagingProvider:
        key = provider_name.strip().lower()
        provider = self._providers.get(key)
        if provider is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Proveedor de mensajeria no soportado: {provider_name}.",
            )
        return provider
