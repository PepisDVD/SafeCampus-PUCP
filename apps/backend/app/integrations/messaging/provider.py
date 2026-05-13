"""Provider contract for external messaging platforms."""

from abc import ABC, abstractmethod
from typing import Any

from app.integrations.messaging.schemas import IncomingMessage


class MessagingProvider(ABC):
    """Common contract implemented by WhatsApp providers."""

    name: str

    @abstractmethod
    def parse_incoming_webhook(self, payload: dict[str, Any]) -> IncomingMessage:
        """Normalize a provider webhook payload to SafeCampus' internal schema."""
