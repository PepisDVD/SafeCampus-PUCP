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
