"""Provider client protocol for LLM integrations."""

from typing import Protocol

from app.llm.schemas import LLMInvocationRequest, LLMProviderResponse


class LLMProviderClient(Protocol):
    provider_name: str

    async def invoke_classification(
        self,
        request: LLMInvocationRequest,
        *,
        api_key: str,
    ) -> LLMProviderResponse:
        """Send a structured classification request to the provider."""
