"""Small HTTP client for EvolutionAPI operations used by SafeCampus."""

from typing import Any

import httpx
from fastapi import HTTPException, status

from app.core.config import settings


class EvolutionApiClient:
    def __init__(self) -> None:
        self._base_url = settings.EVOLUTION_API_URL.rstrip("/")
        self._api_key = settings.EVOLUTION_API_KEY
        self._instance = settings.EVOLUTION_INSTANCE_NAME

    async def send_text(self, *, chat_id: str, text: str) -> dict[str, Any]:
        if not self._api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="EVOLUTION_API_KEY no esta configurado.",
            )

        url = f"{self._base_url}/message/sendText/{self._instance}"
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                url,
                headers={
                    "apikey": self._api_key,
                    "Content-Type": "application/json",
                },
                json={"number": chat_id, "text": text},
            )

        if response.status_code >= 400:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="EvolutionAPI no pudo enviar el mensaje.",
            )
        return response.json()

    async def send_image(
        self,
        *,
        chat_id: str,
        media_base64: str,
        mimetype: str,
        filename: str,
        caption: str | None = None,
    ) -> dict[str, Any]:
        if not self._api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="EVOLUTION_API_KEY no esta configurado.",
            )

        url = f"{self._base_url}/message/sendMedia/{self._instance}"
        payload = {
            "number": chat_id,
            "mediatype": "image",
            "mimetype": mimetype,
            "caption": caption or "",
            "media": media_base64,
            "fileName": filename,
        }
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                url,
                headers={
                    "apikey": self._api_key,
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        if response.status_code >= 400:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="EvolutionAPI no pudo enviar la imagen.",
            )
        return response.json()
