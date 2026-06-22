"""Registry and orchestration for integration health checks."""

from __future__ import annotations

from app.integrations.health.base import HealthChecker, HealthCheckResult
from app.integrations.health.checkers import (
    EvolutionWhatsAppHealthChecker,
    GeminiHealthChecker,
    LeafletMapHealthChecker,
    MetaWhatsAppHealthChecker,
    OpenAIHealthChecker,
    ResendHealthChecker,
)


class HealthCheckService:
    """Resuelve y ejecuta el chequeo de salud de una integración por su clave."""

    def __init__(self, checkers: list[HealthChecker] | None = None) -> None:
        registered = checkers or [
            OpenAIHealthChecker(),
            GeminiHealthChecker(),
            ResendHealthChecker(),
            EvolutionWhatsAppHealthChecker(),
            MetaWhatsAppHealthChecker(),
            LeafletMapHealthChecker(),
        ]
        self._checkers: dict[str, HealthChecker] = {c.service_key: c for c in registered}

    def supports(self, service_key: str) -> bool:
        return service_key in self._checkers

    async def check(self, service_key: str) -> HealthCheckResult:
        """Ejecuta el checker registrado para ``service_key``.

        Si no hay checker registrado (servicio legado o desconocido) devolvemos
        ``DESCONOCIDO`` para no romper la pantalla de monitoreo.
        """
        checker = self._checkers.get(service_key)
        if checker is None:
            return HealthCheckResult.no_configurado(
                f"No hay verificación automática para '{service_key}'."
            )
        return await checker.check()
