"""Shared contracts for external integration health checks.

Cada *checker* representa una integración externa monitoreada en la pantalla de
Administración → Integraciones. El resultado se normaliza a los estados del enum
``estado_servicio`` (OK | DEGRADADO | CAIDO | DESCONOCIDO) para poder persistirlo
en ``sc_dashboard.estado_integracion``.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

# Estados válidos del enum estado_servicio.
ESTADO_OK = "OK"
ESTADO_DEGRADADO = "DEGRADADO"
ESTADO_CAIDO = "CAIDO"
ESTADO_DESCONOCIDO = "DESCONOCIDO"


@dataclass(slots=True)
class HealthCheckResult:
    """Resultado normalizado de un chequeo de integración."""

    estado: str
    tiempo_respuesta_ms: int | None = None
    detalle: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def ok(cls, *, tiempo_respuesta_ms: int | None = None, **detalle: Any) -> HealthCheckResult:
        return cls(ESTADO_OK, tiempo_respuesta_ms, dict(detalle))

    @classmethod
    def degradado(
        cls, mensaje: str, *, tiempo_respuesta_ms: int | None = None, **detalle: Any
    ) -> HealthCheckResult:
        return cls(ESTADO_DEGRADADO, tiempo_respuesta_ms, {"mensaje": mensaje, **detalle})

    @classmethod
    def caido(
        cls, mensaje: str, *, tiempo_respuesta_ms: int | None = None, **detalle: Any
    ) -> HealthCheckResult:
        return cls(ESTADO_CAIDO, tiempo_respuesta_ms, {"mensaje": mensaje, **detalle})

    @classmethod
    def no_configurado(cls, mensaje: str = "Integración no configurada.") -> HealthCheckResult:
        return cls(ESTADO_DESCONOCIDO, None, {"mensaje": mensaje, "configurado": False})


class HealthChecker(ABC):
    """Contrato base para un chequeo de integración externa."""

    #: Clave canónica que coincide con ``estado_integracion.servicio``.
    service_key: str

    def __init__(
        self,
        *,
        timeout_seconds: float = 5.0,
        transport: Any | None = None,
    ) -> None:
        self._timeout_seconds = timeout_seconds
        # Seam de pruebas: permite inyectar un httpx.MockTransport.
        self._transport = transport

    @abstractmethod
    async def check(self) -> HealthCheckResult:
        """Ejecuta el chequeo y devuelve un resultado normalizado."""
        raise NotImplementedError
