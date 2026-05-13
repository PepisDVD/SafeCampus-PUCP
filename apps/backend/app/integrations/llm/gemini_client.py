"""HTTP client for Gemini Generative Language API."""

from time import perf_counter
from typing import Any

import httpx

from app.integrations.llm.exceptions import (
    LLMAuthError,
    LLMClientError,
    LLMRateLimitError,
    LLMServerError,
    LLMTimeoutError,
)
from app.llm.schemas import LLMInvocationRequest, LLMProviderResponse


class GeminiClient:
    provider_name = "gemini"

    def __init__(
        self,
        *,
        timeout_seconds: int,
        base_url: str = "https://generativelanguage.googleapis.com/v1beta",
    ) -> None:
        self._timeout_seconds = timeout_seconds
        self._base_url = base_url.rstrip("/")

    async def invoke_classification(
        self,
        request: LLMInvocationRequest,
        *,
        api_key: str,
    ) -> LLMProviderResponse:
        started_at = perf_counter()
        url = f"{self._base_url}/models/{request.model}:generateContent"
        params = {"key": api_key}
        payload = {
            "systemInstruction": {
                "parts": [{"text": request.system_prompt}],
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": request.user_prompt}],
                }
            ],
            "generationConfig": {
                "temperature": request.temperature,
                "maxOutputTokens": request.max_tokens,
                "responseMimeType": "application/json",
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                response = await client.post(url, params=params, json=payload)
        except (httpx.TimeoutException, httpx.ConnectError) as exc:
            raise LLMTimeoutError("Gemini request timed out.") from exc
        except httpx.HTTPError as exc:
            raise LLMClientError("Gemini request failed before receiving a response.") from exc

        if response.status_code in {401, 403}:
            raise LLMAuthError("Gemini credentials are invalid.")
        if response.status_code == 429:
            raise LLMRateLimitError(
                "Gemini rate limit exceeded.",
                retry_after_seconds=self._retry_after(response),
            )
        if 500 <= response.status_code <= 599:
            raise LLMServerError("Gemini reported an internal error.")
        if response.is_error:
            raise LLMClientError(f"Gemini request failed with status {response.status_code}.")

        body = response.json()
        text = self._extract_text(body)
        usage = body.get("usageMetadata", {})
        return LLMProviderResponse(
            provider=self.provider_name,
            model=request.model,
            text=text,
            latency_ms=int((perf_counter() - started_at) * 1000),
            prompt_tokens=int(usage.get("promptTokenCount", 0) or 0),
            completion_tokens=int(usage.get("candidatesTokenCount", 0) or 0),
            total_tokens=int(usage.get("totalTokenCount", 0) or 0),
            raw_payload=body,
        )

    def _extract_text(self, payload: dict[str, Any]) -> str:
        candidates = payload.get("candidates") or []
        if not candidates:
            raise LLMClientError("Gemini response did not include candidates.")
        content = candidates[0].get("content") or {}
        parts = content.get("parts") or []
        text_parts = [part.get("text", "") for part in parts if isinstance(part, dict)]
        return "".join(text_parts).strip()

    def _retry_after(self, response: httpx.Response) -> float | None:
        retry_after = response.headers.get("retry-after")
        if retry_after is None:
            return None
        try:
            return float(retry_after)
        except ValueError:
            return None