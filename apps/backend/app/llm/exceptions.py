"""Domain exceptions for prompt and normalization workflows."""


class PromptNotFoundError(Exception):
    pass


class MissingPromptVariableError(Exception):
    pass


class LLMOutputParsingError(Exception):
    def __init__(self, fallback_code: str, message: str) -> None:
        super().__init__(message)
        self.fallback_code = fallback_code