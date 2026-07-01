"""Internal schemas for provider-agnostic messaging events."""

from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field


class IncomingMessage(BaseModel):
    """Normalized inbound message used by the omnichannel domain."""

    provider: str
    external_message_id: str | None = None
    instance_name: str | None = None
    sender_phone: str | None = None
    sender_name: str | None = None
    chat_id: str | None = None
    is_group: bool = False
    text: str | None = None
    message_type: str = "unknown"
    event_type: str | None = None
    latitud: float | None = None
    longitud: float | None = None
    raw_payload: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)
    received_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @property
    def has_location(self) -> bool:
        return self.latitud is not None and self.longitud is not None

    @property
    def content_for_storage(self) -> str:
        if self.text and self.text.strip():
            return self.text.strip()
        if self.has_location:
            return "📍 Ubicación compartida"
        return f"[{self.message_type}]"
