"""Meta WhatsApp Cloud API provider adapter placeholder."""

from typing import Any

from app.integrations.messaging.provider import MessagingProvider
from app.integrations.messaging.schemas import IncomingMessage


class MetaWhatsAppProvider(MessagingProvider):
    name = "meta"

    def parse_incoming_webhook(self, payload: dict[str, Any]) -> IncomingMessage:
        # TODO: Implement when Meta app credentials and webhook verification are approved.
        raise NotImplementedError("Meta WhatsApp Cloud API provider is not enabled yet.")
