"""Async OpenAI client adapter for SafeCampus classification."""

from time import perf_counter
from typing import Any, Callable

from openai import (
    APIConnectionError,
    APIError,
    APITimeoutError,
    AsyncOpenAI,
    AuthenticationError,
    InternalServerError,
    RateLimitError,
)

from app.integrations.llm.exceptions import (
    LLMAuthError,
    LLMClientError,
    LLMRateLimitError,
    LLMServerError,
    LLMTimeoutError,
)
from app.llm.schemas import LLMInvocationRequest, LLMProviderResponse


class OpenAIClient:
    provider_name = "openai"

    def __init__(
        self,
        *,
        timeout_seconds: int,
        client_factory: Callable[[str, int], AsyncOpenAI] | None = None,
    ) -> None:
        self._timeout_seconds = timeout_seconds
        self._client_factory = client_factory or self._build_client

    def _build_client(self, api_key: str, timeout_seconds: int) -> AsyncOpenAI:
        return AsyncOpenAI(api_key=api_key, timeout=timeout_seconds)

    async def invoke_classification(
        self,
        request: LLMInvocationRequest,
        *,
        api_key: str,
    ) -> LLMProviderResponse:
        client = self._client_factory(api_key, self._timeout_seconds)
        started_at = perf_counter()
        try:
            response = await client.chat.completions.create(
                model=request.model,
                messages=[
                    {"role": "system", "content": request.system_prompt},
                    {"role": "user", "content": request.user_prompt},
                ],
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                response_format={"type": "json_object"},
            )
        except (APITimeoutError, APIConnectionError) as exc:
            raise LLMTimeoutError("OpenAI request timed out.") from exc
        except AuthenticationError as exc:
            raise LLMAuthError("OpenAI credentials are invalid.") from exc
        except RateLimitError as exc:
            retry_after = self._extract_retry_after(exc)
            raise LLMRateLimitError(
                "OpenAI rate limit exceeded.",
                retry_after_seconds=retry_after,
            ) from exc
        except InternalServerError as exc:
            raise LLMServerError("OpenAI reported an internal error.") from exc
        except APIError as exc:
            raise LLMClientError("OpenAI request failed.") from exc

        choice = response.choices[0] if response.choices else None
        content = choice.message.content if choice and choice.message else None
        usage = response.usage
        return LLMProviderResponse(
            provider=self.provider_name,
            model=request.model,
            text=content or "",
            latency_ms=int((perf_counter() - started_at) * 1000),
            prompt_tokens=usage.prompt_tokens if usage else 0,
            completion_tokens=usage.completion_tokens if usage else 0,
            total_tokens=usage.total_tokens if usage else 0,
            raw_payload=self._serialize_response(response),
        )

    def _serialize_response(self, response: Any) -> dict[str, Any]:
        if hasattr(response, "model_dump"):
            payload = response.model_dump()
            if isinstance(payload, dict):
                return payload
        return {"response": str(response)}

    def _extract_retry_after(self, exc: RateLimitError) -> float | None:
        headers = getattr(getattr(exc, "response", None), "headers", None)
        if not headers:
            return None
        retry_after = headers.get("retry-after")
        if retry_after is None:
            return None
        try:
            return float(retry_after)
        except ValueError:
            return None