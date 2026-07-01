"""Prompt, provider, fallback, and normalization orchestration."""

import asyncio
import logging
from collections.abc import Awaitable, Callable

from app.core.config import settings
from app.integrations.llm import (
    GeminiClient,
    LLMAuthError,
    LLMClientError,
    LLMProviderClient,
    LLMRateLimitError,
    LLMServerError,
    LLMTimeoutError,
    OpenAIClient,
)
from app.llm.business_rules import BusinessRulesEngine
from app.llm.exceptions import LLMOutputParsingError
from app.llm.key_manager import LLMKeyManager
from app.llm.normalizer import LLMResponseNormalizer
from app.llm.prompt_factory import PromptFactory
from app.llm.schemas import (
    ClassificationPipelineResult,
    IncidentLLMContext,
    LLMInvocationRequest,
    LLMProviderName,
)

logger = logging.getLogger(__name__)


class LLMOrchestrator:
    def __init__(
        self,
        *,
        prompt_factory: PromptFactory | None = None,
        key_manager: LLMKeyManager | None = None,
        normalizer: LLMResponseNormalizer | None = None,
        business_rules: BusinessRulesEngine | None = None,
        provider_clients: dict[LLMProviderName, LLMProviderClient] | None = None,
        sleep_func: Callable[[float], Awaitable[None]] = asyncio.sleep,
    ) -> None:
        self._prompt_factory = prompt_factory or PromptFactory()
        self._key_manager = key_manager or LLMKeyManager()
        self._normalizer = normalizer or LLMResponseNormalizer()
        self._business_rules = business_rules or BusinessRulesEngine()
        self._provider_clients = provider_clients or {
            LLMProviderName.OPENAI: OpenAIClient(timeout_seconds=settings.LLM_TIMEOUT_SECONDS),
            LLMProviderName.GEMINI: GeminiClient(timeout_seconds=settings.LLM_TIMEOUT_SECONDS),
        }
        self._sleep = sleep_func

    async def classify(
        self,
        context: IncidentLLMContext,
        *,
        provider: LLMProviderName | None = None,
    ) -> ClassificationPipelineResult:
        prompt = self._prompt_factory.get_active_prompt("clasificacion")
        user_prompt = self._prompt_factory.compile_user_message(
            prompt,
            context.as_prompt_variables(),
        )
        selected_provider = provider or LLMProviderName(settings.LLM_PROVIDER)
        model = self._key_manager.get_active_model(
            selected_provider,
            prompt.metadata.modelo_objetivo,
        )
        max_tokens = prompt.metadata.max_tokens
        if selected_provider == LLMProviderName.GEMINI:
            max_tokens = max(prompt.metadata.max_tokens, settings.GEMINI_MAX_TOKENS)

        request = LLMInvocationRequest(
            system_prompt=prompt.system_message,
            user_prompt=user_prompt,
            model=model,
            temperature=prompt.metadata.temperatura,
            max_tokens=max_tokens,
            correlation_id=context.correlation_id,
            prompt_version=prompt.metadata.id,
            incident_id=context.incident_id,
        )

        client = self._provider_clients[selected_provider]
        api_key = self._key_manager.get_active_key(selected_provider)
        max_attempts = max(1, settings.LLM_MAX_ATTEMPTS)
        malformed_json_retries = 0
        rate_limit_retries = 0
        last_latency_ms: int | None = None

        for attempt in range(1, max_attempts + 1):
            try:
                logger.info(
                    "llm_invocation_start",
                    extra={
                        "correlation_id": context.correlation_id,
                        "incident_id": context.incident_id,
                        "provider": selected_provider,
                        "model": model,
                        "prompt_version": prompt.metadata.id,
                        "attempt": attempt,
                    },
                )
                provider_response = await client.invoke_classification(request, api_key=api_key)
                last_latency_ms = provider_response.latency_ms
                self._key_manager.record_usage(
                    provider=selected_provider,
                    correlation_id=context.correlation_id,
                    incident_id=context.incident_id,
                    model=model,
                    prompt_version=prompt.metadata.id,
                    prompt_tokens=provider_response.prompt_tokens,
                    completion_tokens=provider_response.completion_tokens,
                    total_tokens=provider_response.total_tokens,
                )
                normalized = self._normalizer.normalize(provider_response.text)
                final = self._normalizer.build_final(
                    normalized=normalized,
                    context=context,
                    provider=selected_provider,
                    model_used=model,
                    raw_response_text=provider_response.text,
                    latency_ms=provider_response.latency_ms,
                )
                final = self._business_rules.apply(final, descripcion=context.descripcion)
                logger.info(
                    "llm_invocation_success",
                    extra={
                        "correlation_id": context.correlation_id,
                        "provider": selected_provider,
                        "latency_ms": provider_response.latency_ms,
                        "tokens_total": provider_response.total_tokens,
                    },
                )
                return ClassificationPipelineResult(
                    normalized=normalized,
                    final=final,
                    provider_response=provider_response,
                )
            except LLMOutputParsingError as exc:
                malformed_json_retries += 1
                if malformed_json_retries <= 1 and attempt < max_attempts:
                    logger.warning(
                        "llm_invocation_error",
                        extra={
                            "correlation_id": context.correlation_id,
                            "error_type": exc.fallback_code,
                            "attempt": attempt,
                            "will_retry": True,
                        },
                    )
                    await self._sleep(1.0)
                    continue
                break
            except LLMAuthError:
                return self._fallback_result(
                    context=context,
                    provider=selected_provider,
                    model=model,
                    fallback_reason="FB-03",
                    latency_ms=last_latency_ms,
                )
            except LLMRateLimitError as exc:
                rate_limit_retries += 1
                if rate_limit_retries <= 1 and attempt < max_attempts:
                    await self._sleep(exc.retry_after_seconds or 1.0)
                    continue
                return self._fallback_result(
                    context=context,
                    provider=selected_provider,
                    model=model,
                    fallback_reason="FB-04",
                    latency_ms=last_latency_ms,
                )
            except (LLMTimeoutError, LLMServerError) as exc:
                if attempt < max_attempts:
                    await self._sleep(2 ** (attempt - 1))
                    continue
                fallback_reason = "FB-01" if isinstance(exc, LLMTimeoutError) else "FB-02"
                return self._fallback_result(
                    context=context,
                    provider=selected_provider,
                    model=model,
                    fallback_reason=fallback_reason,
                    latency_ms=last_latency_ms,
                )
            except LLMClientError:
                return self._fallback_result(
                    context=context,
                    provider=selected_provider,
                    model=model,
                    fallback_reason="FB-10",
                    latency_ms=last_latency_ms,
                )

        return self._fallback_result(
            context=context,
            provider=selected_provider,
            model=model,
            fallback_reason="FB-09",
            latency_ms=last_latency_ms,
        )

    def _fallback_result(
        self,
        *,
        context: IncidentLLMContext,
        provider: LLMProviderName,
        model: str,
        fallback_reason: str,
        latency_ms: int | None,
    ) -> ClassificationPipelineResult:
        final = self._normalizer.default_classification(
            context=context,
            provider=provider,
            model_used=model,
            fallback_reason=fallback_reason,
            latency_ms=latency_ms,
        )
        normalized = self._normalizer.normalize(
            '{"categoria":"OTRO","severidad":"MEDIO","confidence_score":0.0,'
            '"requires_human_review":true,"indicadores_detectados":[],'
            '"razonamiento_breve":"Clasificacion por defecto. Requiere revision humana.",'
            '"version_prompt":null}'
        )
        return ClassificationPipelineResult(normalized=normalized, final=final)
