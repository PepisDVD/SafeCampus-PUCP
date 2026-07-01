"""Centralized LLM credential access and usage tracking."""

from collections import defaultdict
from typing import Any

from app.core.config import settings
from app.integrations.llm.exceptions import LLMAuthError
from app.llm.schemas import LLMProviderName


class LLMKeyManager:
    def __init__(self) -> None:
        self._usage_entries: list[dict[str, Any]] = []
        self._usage_by_provider: dict[str, int] = defaultdict(int)

    def get_active_key(self, provider: LLMProviderName) -> str:
        if provider == LLMProviderName.OPENAI:
            api_key = settings.OPENAI_API_KEY.strip()
        else:
            api_key = settings.GEMINI_API_KEY.strip()
        if not api_key:
            raise LLMAuthError(f"Missing API key for provider '{provider}'.")
        return api_key

    def get_active_model(self, provider: LLMProviderName, prompt_model: str | None = None) -> str:
        if provider == LLMProviderName.OPENAI:
            return settings.OPENAI_MODEL or prompt_model or "gpt-4o-mini"
        return settings.GEMINI_MODEL or prompt_model or "gemini-2.0-flash"

    def record_usage(
        self,
        *,
        provider: LLMProviderName,
        correlation_id: str,
        incident_id: str | None,
        model: str,
        prompt_version: str | None,
        prompt_tokens: int,
        completion_tokens: int,
        total_tokens: int,
    ) -> None:
        entry = {
            "provider": provider,
            "correlation_id": correlation_id,
            "incident_id": incident_id,
            "model": model,
            "prompt_version": prompt_version,
            "tokens_prompt": prompt_tokens,
            "tokens_completion": completion_tokens,
            "tokens_total": total_tokens,
        }
        self._usage_entries.append(entry)
        self._usage_by_provider[str(provider)] += total_tokens

    def get_usage_summary(self) -> dict[str, Any]:
        return {
            "entries": len(self._usage_entries),
            "tokens_by_provider": dict(self._usage_by_provider),
            "total_tokens": sum(item["tokens_total"] for item in self._usage_entries),
        }
