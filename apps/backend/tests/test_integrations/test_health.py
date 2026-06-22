import httpx

from app.core.config import settings
from app.integrations.health.base import HealthChecker, HealthCheckResult
from app.integrations.health.checkers import (
    EvolutionWhatsAppHealthChecker,
    GeminiHealthChecker,
    LeafletMapHealthChecker,
    MetaWhatsAppHealthChecker,
    OpenAIHealthChecker,
    ResendHealthChecker,
)
from app.integrations.health.service import HealthCheckService


def _transport(status_code: int, json_body: dict | None = None) -> httpx.MockTransport:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code, json=json_body or {})

    return httpx.MockTransport(handler)


def test_health_result_helpers():
    ok = HealthCheckResult.ok(tiempo_respuesta_ms=12, modelo="gpt")
    assert ok.estado == "OK"
    assert ok.tiempo_respuesta_ms == 12
    assert ok.detalle["modelo"] == "gpt"

    caido = HealthCheckResult.caido("boom")
    assert caido.estado == "CAIDO"
    assert caido.detalle["mensaje"] == "boom"

    desconocido = HealthCheckResult.no_configurado()
    assert desconocido.estado == "DESCONOCIDO"
    assert desconocido.detalle["configurado"] is False


async def test_openai_checker_no_configurado(monkeypatch):
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "")
    result = await OpenAIHealthChecker().check()
    assert result.estado == "DESCONOCIDO"


async def test_openai_checker_ok(monkeypatch):
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-test")
    checker = OpenAIHealthChecker(transport=_transport(200, {"data": []}))
    result = await checker.check()
    assert result.estado == "OK"


async def test_openai_checker_invalid_credentials(monkeypatch):
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-bad")
    checker = OpenAIHealthChecker(transport=_transport(401))
    result = await checker.check()
    assert result.estado == "CAIDO"


async def test_gemini_checker_no_configurado(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    result = await GeminiHealthChecker().check()
    assert result.estado == "DESCONOCIDO"


async def test_gemini_checker_ok(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "key")
    checker = GeminiHealthChecker(transport=_transport(200, {"models": []}))
    result = await checker.check()
    assert result.estado == "OK"


async def test_resend_checker_no_configurado(monkeypatch):
    monkeypatch.setattr(settings, "RESEND_API_KEY", "")
    result = await ResendHealthChecker().check()
    assert result.estado == "DESCONOCIDO"


async def test_resend_checker_ok(monkeypatch):
    monkeypatch.setattr(settings, "RESEND_API_KEY", "re_test")
    checker = ResendHealthChecker(transport=_transport(200, {"data": []}))
    result = await checker.check()
    assert result.estado == "OK"


async def test_evolution_checker_no_url(monkeypatch):
    monkeypatch.setattr(settings, "EVOLUTION_API_URL", "")
    result = await EvolutionWhatsAppHealthChecker().check()
    assert result.estado == "DESCONOCIDO"


async def test_evolution_checker_connected(monkeypatch):
    monkeypatch.setattr(settings, "EVOLUTION_API_URL", "http://localhost:8080")
    monkeypatch.setattr(settings, "EVOLUTION_API_KEY", "apikey")
    monkeypatch.setattr(settings, "EVOLUTION_INSTANCE_NAME", "safecampus-dev")
    checker = EvolutionWhatsAppHealthChecker(
        transport=_transport(200, {"instance": {"state": "open"}})
    )
    result = await checker.check()
    assert result.estado == "OK"


async def test_evolution_checker_disconnected_is_degraded(monkeypatch):
    monkeypatch.setattr(settings, "EVOLUTION_API_URL", "http://localhost:8080")
    monkeypatch.setattr(settings, "EVOLUTION_API_KEY", "apikey")
    monkeypatch.setattr(settings, "EVOLUTION_INSTANCE_NAME", "safecampus-dev")
    checker = EvolutionWhatsAppHealthChecker(
        transport=_transport(200, {"instance": {"state": "close"}})
    )
    result = await checker.check()
    assert result.estado == "DEGRADADO"


async def test_meta_checker_no_configurado(monkeypatch):
    monkeypatch.setattr(settings, "META_WHATSAPP_TOKEN", "")
    monkeypatch.setattr(settings, "META_WHATSAPP_PHONE_NUMBER_ID", "")
    result = await MetaWhatsAppHealthChecker().check()
    assert result.estado == "DESCONOCIDO"


async def test_leaflet_checker_ok():
    checker = LeafletMapHealthChecker(transport=_transport(200))
    result = await checker.check()
    assert result.estado == "OK"


async def test_health_service_unknown_service_returns_desconocido():
    service = HealthCheckService(checkers=[])
    result = await service.check("inexistente")
    assert result.estado == "DESCONOCIDO"
    assert service.supports("inexistente") is False


async def test_health_service_dispatches_to_registered_checker():
    class FakeChecker(HealthChecker):
        service_key = "fake"

        async def check(self) -> HealthCheckResult:
            return HealthCheckResult.ok(tiempo_respuesta_ms=1)

    service = HealthCheckService(checkers=[FakeChecker()])
    assert service.supports("fake") is True
    result = await service.check("fake")
    assert result.estado == "OK"


def test_default_service_registers_expected_keys():
    service = HealthCheckService()
    for key in (
        "openai",
        "gemini",
        "resend",
        "whatsapp_evolution",
        "whatsapp_meta",
        "leaflet",
    ):
        assert service.supports(key) is True
