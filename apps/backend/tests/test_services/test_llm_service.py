from app.integrations.llm.exceptions import LLMServerError
from app.llm.business_rules import BusinessRulesEngine
from app.llm.key_manager import LLMKeyManager
from app.llm.normalizer import LLMResponseNormalizer
from app.llm.orchestrator import LLMOrchestrator
from app.llm.prompt_factory import PromptFactory
from app.llm.schemas import (
    IncidentLLMContext,
    LLMInvocationRequest,
    LLMProviderName,
    LLMProviderResponse,
)
from app.services.llm_service import LLMService


class FakeProviderClient:
    provider_name = "openai"

    def __init__(self, text: str) -> None:
        self._text = text

    async def invoke_classification(
        self,
        request: LLMInvocationRequest,
        *,
        api_key: str,
    ) -> LLMProviderResponse:
        return LLMProviderResponse(
            provider="openai",
            model=request.model,
            text=self._text,
            latency_ms=25,
            prompt_tokens=10,
            completion_tokens=15,
            total_tokens=25,
            raw_payload={"ok": True},
        )


class FailingProviderClient:
    provider_name = "openai"

    async def invoke_classification(
        self,
        request: LLMInvocationRequest,
        *,
        api_key: str,
    ) -> LLMProviderResponse:
        raise LLMServerError("boom")


def test_prompt_factory_compiles_active_prompt() -> None:
    factory = PromptFactory()

    template = factory.get_active_prompt()
    compiled = factory.compile_user_message(
        template,
        {
            "canal": "WHATSAPP",
            "descripcion": "Se reporta humo en cafeteria",
            "ubicacion": "Cafeteria",
            "fecha_hora": "2026-05-13T10:00:00Z",
            "contexto_adicional": "Sin lesionados",
        },
    )

    assert template.metadata.id == "PROMPT-IA-CLAS-v1.0"
    assert "DESCRIPCION DEL INCIDENTE" in compiled


def test_normalizer_maps_invalid_values() -> None:
    normalizer = LLMResponseNormalizer()

    result = normalizer.normalize(
        '{"categoria":"hurto","severidad":"urgente","confidence_score":1.2,'
        '"requires_human_review":"yes","indicadores_detectados":"arma",'
        '"razonamiento_breve":"' + ('x' * 140) + '","version_prompt":null}'
    )

    assert result.categoria == "ROBO_HURTO"
    assert result.severidad == "ALTO"
    assert result.confidence_score == 1.0
    assert result.requires_human_review is True
    assert any(event.startswith("FB-07") for event in result.normalization_events)


def test_business_rules_raise_critical_and_notification() -> None:
    normalizer = LLMResponseNormalizer()
    final = normalizer.build_final(
        normalized=normalizer.normalize(
            '{"categoria":"VIOLENCIA","severidad":"MEDIO","confidence_score":0.75,'
            '"requires_human_review":false,"indicadores_detectados":[],'
            '"razonamiento_breve":"Pelea reportada","version_prompt":"PROMPT-IA-CLAS-v1.0"}'
        ),
        context=IncidentLLMContext(descripcion="Hay un cuchillo y un herido en el patio"),
        provider=LLMProviderName.OPENAI,
        model_used="gpt-4o-mini",
        raw_response_text="{}",
        latency_ms=12,
    )

    enriched = BusinessRulesEngine().apply(
        final,
        descripcion="Hay un cuchillo y un herido en el patio",
    )

    assert enriched.severidad == "CRITICO"
    assert enriched.notification_required is True
    assert "BR-SEV-01" in enriched.business_rules_applied


async def test_orchestrator_returns_fallback_after_retries(monkeypatch) -> None:
    monkeypatch.setattr("app.core.config.settings.OPENAI_API_KEY", "test-openai-key")
    monkeypatch.setattr("app.core.config.settings.LLM_PROVIDER", "openai")
    monkeypatch.setattr("app.core.config.settings.LLM_MAX_ATTEMPTS", 2)

    orchestrator = LLMOrchestrator(
        key_manager=LLMKeyManager(),
        provider_clients={LLMProviderName.OPENAI: FailingProviderClient()},
        sleep_func=_noop_sleep,
    )

    result = await orchestrator.classify(
        IncidentLLMContext(descripcion="Mensaje de prueba"),
        provider=LLMProviderName.OPENAI,
    )

    assert result.final.fallback_applied is True
    assert result.final.fallback_reason == "FB-02"


async def test_llm_service_classifies_whatsapp_message(monkeypatch) -> None:
    monkeypatch.setattr("app.core.config.settings.OPENAI_API_KEY", "test-openai-key")
    monkeypatch.setattr("app.core.config.settings.LLM_PROVIDER", "openai")

    orchestrator = LLMOrchestrator(
        key_manager=LLMKeyManager(),
        provider_clients={
            LLMProviderName.OPENAI: FakeProviderClient(
                '{"categoria":"COMPORTAMIENTO_SOSPECHOSO","severidad":"ALTO",'
                '"confidence_score":0.82,"requires_human_review":false,'
                '"indicadores_detectados":["intrusos"],'
                '"razonamiento_breve":"Intrusos cerca al laboratorio",'
                '"version_prompt":"PROMPT-IA-CLAS-v1.0"}'
            )
        },
        sleep_func=_noop_sleep,
    )
    service = LLMService(orchestrator=orchestrator)

    result = await service.classify_whatsapp_message(
        descripcion="Se reportan intrusos cerca al laboratorio de redes",
    )

    assert result.final.categoria == "COMPORTAMIENTO_SOSPECHOSO"
    assert result.final.severidad == "ALTO"
    assert result.final.provider_used == "openai"


async def _noop_sleep(_: float) -> None:
    return None