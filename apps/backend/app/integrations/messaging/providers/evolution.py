"""EvolutionAPI WhatsApp provider adapter."""

from typing import Any

from app.integrations.messaging.provider import MessagingProvider
from app.integrations.messaging.schemas import IncomingMessage


class EvolutionWhatsAppProvider(MessagingProvider):
    name = "evolution"

    def parse_incoming_webhook(self, payload: dict[str, Any]) -> IncomingMessage:
        data_raw = payload.get("data")
        data: dict[str, Any] = data_raw if isinstance(data_raw, dict) else {}
        key_raw = data.get("key")
        key: dict[str, Any] = key_raw if isinstance(key_raw, dict) else {}
        message_raw = data.get("message")
        message: dict[str, Any] = message_raw if isinstance(message_raw, dict) else {}

        text = self._extract_text(message)
        message_type = self._detect_message_type(message)
        latitud, longitud = self._extract_location_coords(message)
        chat_id = self._first_str(
            key.get("remoteJid"),
            data.get("remoteJid"),
            data.get("chatId"),
            payload.get("chatId"),
        )
        is_group = self._is_group_chat(chat_id)

        return IncomingMessage(
            provider=self.name,
            external_message_id=self._first_str(
                key.get("id"),
                data.get("messageId"),
                data.get("id"),
                payload.get("messageId"),
            ),
            instance_name=self._first_str(
                payload.get("instance"),
                payload.get("instanceName"),
                data.get("instance"),
            ),
            sender_phone=self._normalize_phone(
                self._first_str(
                    data.get("sender"),
                    data.get("participant"),
                    key.get("participant"),
                    data.get("from"),
                    chat_id,
                )
            ),
            sender_name=self._first_str(data.get("pushName"), payload.get("pushName")),
            chat_id=chat_id,
            is_group=is_group,
            text=text,
            message_type=message_type,
            latitud=latitud,
            longitud=longitud,
            event_type=self._first_str(payload.get("event"), data.get("event")),
            raw_payload=payload,
            metadata={
                "from_me": bool(key.get("fromMe")),
                "is_group": is_group,
                "source": self._first_str(data.get("source"), payload.get("source")),
                "message_type": message_type,
            },
        )

    @classmethod
    def _extract_text(cls, message: dict[str, Any]) -> str | None:
        candidates = [
            message.get("conversation"),
            cls._nested(message, "extendedTextMessage", "text"),
            cls._nested(message, "imageMessage", "caption"),
            cls._nested(message, "videoMessage", "caption"),
            cls._nested(message, "documentMessage", "caption"),
            cls._nested(message, "buttonsResponseMessage", "selectedDisplayText"),
            cls._nested(message, "listResponseMessage", "title"),
        ]
        for value in candidates:
            if isinstance(value, str) and value.strip():
                return value.strip()
        return None

    @classmethod
    def _extract_location_coords(cls, message: dict[str, Any]) -> tuple[float | None, float | None]:
        """Extrae lat/lng de un mensaje de ubicación (estática o en vivo)."""
        for key in ("locationMessage", "liveLocationMessage"):
            node = message.get(key)
            if not isinstance(node, dict):
                continue
            lat = node.get("degreesLatitude")
            lng = node.get("degreesLongitude")
            if isinstance(lat, (int, float)) and isinstance(lng, (int, float)):
                return float(lat), float(lng)
        return None, None

    @staticmethod
    def _detect_message_type(message: dict[str, Any]) -> str:
        for key in message:
            if key.endswith("Message"):
                return key.removesuffix("Message")
        if "conversation" in message:
            return "text"
        return "unknown"

    @staticmethod
    def _nested(data: dict[str, Any], *path: str) -> Any:
        current: Any = data
        for item in path:
            if not isinstance(current, dict):
                return None
            current = current.get(item)
        return current

    @staticmethod
    def _first_str(*values: Any) -> str | None:
        for value in values:
            if isinstance(value, str) and value.strip():
                return value.strip()
        return None

    @staticmethod
    def _normalize_phone(value: str | None) -> str | None:
        if not value:
            return None
        identifier = value.split("@", 1)[0]
        digits = "".join(char for char in identifier if char.isdigit())
        return digits or None

    @staticmethod
    def _is_group_chat(chat_id: str | None) -> bool:
        return bool(chat_id and chat_id.endswith("@g.us"))
