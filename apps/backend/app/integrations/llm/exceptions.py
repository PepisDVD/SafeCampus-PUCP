"""Provider-facing exceptions normalized for orchestration."""


class LLMProviderError(Exception):
    def __init__(self, message: str, *, retry_after_seconds: float | None = None) -> None:
        super().__init__(message)
        self.retry_after_seconds = retry_after_seconds


class LLMTimeoutError(LLMProviderError):
    pass


class LLMAuthError(LLMProviderError):
    pass


class LLMRateLimitError(LLMProviderError):
    pass


class LLMServerError(LLMProviderError):
    pass


class LLMClientError(LLMProviderError):
    pass
