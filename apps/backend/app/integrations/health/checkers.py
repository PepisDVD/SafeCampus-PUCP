"""Concrete health checkers for SafeCampus external integrations.

Cada checker realiza una verificación liviana (preferentemente un endpoint de
estado o de bajo costo) contra el proveedor real usando ``httpx``. Si la
credencial no está configurada, el resultado es ``DESCONOCIDO`` (no configurado)
en lugar de ``CAIDO``, porque la integración simplemente no aplica al entorno.
"""

from __future__ import annotations

from time import perf_counter

import httpx

from app.core.config import settings
from app.integrations.health.base import HealthChecker, HealthCheckResult


class _HttpHealthChecker(HealthChecker):
    """Base con utilidades comunes para checkers basados en HTTP."""

    async def _timed_request(
        self,
        method: str,
        url: str,
        **kwargs: object,
    ) -> tuple[httpx.Response | None, int, Exception | None]:
        started_at = perf_counter()
        try:
            async with httpx.AsyncClient(
                timeout=self._timeout_seconds,
                transport=self._transport,
            ) as client:
                response = await client.request(method, url, **kwargs)  # type: ignore[arg-type]
            elapsed = int((perf_counter() - started_at) * 1000)
            return response, elapsed, None
        except (httpx.TimeoutException, httpx.ConnectError) as exc:
            elapsed = int((perf_counter() - started_at) * 1000)
            return None, elapsed, exc
        except httpx.HTTPError as exc:
            elapsed = int((perf_counter() - started_at) * 1000)
            return None, elapsed, exc


class OpenAIHealthChecker(_HttpHealthChecker):
    service_key = "openai"

    async def check(self) -> HealthCheckResult:
        if not settings.OPENAI_API_KEY:
            return HealthCheckResult.no_configurado("Falta OPENAI_API_KEY.")

        response, elapsed, error = await self._timed_request(
            "GET",
            "https://api.openai.com/v1/models",
            headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
        )
        if error is not None:
            return HealthCheckResult.caido(
                "No se pudo conectar con OpenAI.", tiempo_respuesta_ms=elapsed
            )
        assert response is not None
        if response.status_code in (401, 403):
            return HealthCheckResult.caido(
                "Credenciales de OpenAI inválidas.",
                tiempo_respuesta_ms=elapsed,
                http_status=response.status_code,
            )
        if response.status_code == 429:
            return HealthCheckResult.degradado(
                "OpenAI reportó límite de tasa (rate limit).",
                tiempo_respuesta_ms=elapsed,
                http_status=429,
            )
        if response.is_success:
            return HealthCheckResult.ok(tiempo_respuesta_ms=elapsed, modelo=settings.OPENAI_MODEL)
        return HealthCheckResult.degradado(
            f"Respuesta inesperada de OpenAI ({response.status_code}).",
            tiempo_respuesta_ms=elapsed,
            http_status=response.status_code,
        )


class GeminiHealthChecker(_HttpHealthChecker):
    service_key = "gemini"

    async def check(self) -> HealthCheckResult:
        if not settings.GEMINI_API_KEY:
            return HealthCheckResult.no_configurado("Falta GEMINI_API_KEY.")

        response, elapsed, error = await self._timed_request(
            "GET",
            "https://generativelanguage.googleapis.com/v1beta/models",
            params={"key": settings.GEMINI_API_KEY},
        )
        if error is not None:
            return HealthCheckResult.caido(
                "No se pudo conectar con Gemini.", tiempo_respuesta_ms=elapsed
            )
        assert response is not None
        if response.status_code in (401, 403):
            return HealthCheckResult.caido(
                "Credenciales de Gemini inválidas.",
                tiempo_respuesta_ms=elapsed,
                http_status=response.status_code,
            )
        if response.status_code == 429:
            return HealthCheckResult.degradado(
                "Gemini reportó límite de tasa (rate limit).",
                tiempo_respuesta_ms=elapsed,
                http_status=429,
            )
        if response.is_success:
            return HealthCheckResult.ok(tiempo_respuesta_ms=elapsed, modelo=settings.GEMINI_MODEL)
        return HealthCheckResult.degradado(
            f"Respuesta inesperada de Gemini ({response.status_code}).",
            tiempo_respuesta_ms=elapsed,
            http_status=response.status_code,
        )


class ResendHealthChecker(_HttpHealthChecker):
    service_key = "resend"

    async def check(self) -> HealthCheckResult:
        if not settings.RESEND_API_KEY:
            return HealthCheckResult.no_configurado("Falta RESEND_API_KEY.")

        response, elapsed, error = await self._timed_request(
            "GET",
            "https://api.resend.com/domains",
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
        )
        if error is not None:
            return HealthCheckResult.caido(
                "No se pudo conectar con Resend.", tiempo_respuesta_ms=elapsed
            )
        assert response is not None
        if response.status_code in (401, 403):
            return HealthCheckResult.caido(
                "Credenciales de Resend inválidas.",
                tiempo_respuesta_ms=elapsed,
                http_status=response.status_code,
            )
        if response.is_success:
            return HealthCheckResult.ok(
                tiempo_respuesta_ms=elapsed, remitente=settings.RESEND_FROM_EMAIL or None
            )
        return HealthCheckResult.degradado(
            f"Respuesta inesperada de Resend ({response.status_code}).",
            tiempo_respuesta_ms=elapsed,
            http_status=response.status_code,
        )


class EvolutionWhatsAppHealthChecker(_HttpHealthChecker):
    """WhatsApp vía EvolutionAPI (entorno de desarrollo, self-hosted en Docker)."""

    service_key = "whatsapp_evolution"

    async def check(self) -> HealthCheckResult:
        base_url = settings.EVOLUTION_API_URL.strip().rstrip("/")
        if not base_url:
            return HealthCheckResult.no_configurado("Falta EVOLUTION_API_URL.")

        instance = settings.EVOLUTION_INSTANCE_NAME.strip()
        headers = {"apikey": settings.EVOLUTION_API_KEY} if settings.EVOLUTION_API_KEY else {}

        # Si hay instancia + apikey verificamos el estado de conexión real;
        # en caso contrario nos conformamos con el endpoint raíz de salud.
        if instance and settings.EVOLUTION_API_KEY:
            url = f"{base_url}/instance/connectionState/{instance}"
        else:
            url = base_url

        response, elapsed, error = await self._timed_request("GET", url, headers=headers)
        if error is not None:
            return HealthCheckResult.caido(
                "EvolutionAPI no responde (¿contenedor Docker apagado?).",
                tiempo_respuesta_ms=elapsed,
                url=url,
            )
        assert response is not None
        if response.status_code in (401, 403):
            return HealthCheckResult.caido(
                "API key de EvolutionAPI inválida.",
                tiempo_respuesta_ms=elapsed,
                http_status=response.status_code,
            )
        if not response.is_success:
            return HealthCheckResult.degradado(
                f"Respuesta inesperada de EvolutionAPI ({response.status_code}).",
                tiempo_respuesta_ms=elapsed,
                http_status=response.status_code,
            )

        estado_conexion = self._extract_connection_state(response)
        if estado_conexion is None:
            return HealthCheckResult.ok(tiempo_respuesta_ms=elapsed, instancia=instance or None)
        if estado_conexion == "open":
            return HealthCheckResult.ok(
                tiempo_respuesta_ms=elapsed, instancia=instance, conexion=estado_conexion
            )
        return HealthCheckResult.degradado(
            "EvolutionAPI activo pero la instancia no está conectada a WhatsApp.",
            tiempo_respuesta_ms=elapsed,
            instancia=instance,
            conexion=estado_conexion,
        )

    @staticmethod
    def _extract_connection_state(response: httpx.Response) -> str | None:
        try:
            body = response.json()
        except ValueError:
            return None
        if not isinstance(body, dict):
            return None
        instance = body.get("instance")
        if isinstance(instance, dict):
            state = instance.get("state") or instance.get("connectionStatus")
            if isinstance(state, str):
                return state
        state = body.get("state")
        return state if isinstance(state, str) else None


class MetaWhatsAppHealthChecker(_HttpHealthChecker):
    """WhatsApp Business vía Meta Cloud API (entorno productivo)."""

    service_key = "whatsapp_meta"

    async def check(self) -> HealthCheckResult:
        token = settings.META_WHATSAPP_TOKEN.strip()
        phone_id = settings.META_WHATSAPP_PHONE_NUMBER_ID.strip()
        if not token or not phone_id:
            return HealthCheckResult.no_configurado(
                "Falta META_WHATSAPP_TOKEN o META_WHATSAPP_PHONE_NUMBER_ID."
            )

        response, elapsed, error = await self._timed_request(
            "GET",
            f"https://graph.facebook.com/v21.0/{phone_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        if error is not None:
            return HealthCheckResult.caido(
                "No se pudo conectar con Meta Cloud API.", tiempo_respuesta_ms=elapsed
            )
        assert response is not None
        if response.status_code in (401, 403):
            return HealthCheckResult.caido(
                "Token de Meta WhatsApp inválido o expirado.",
                tiempo_respuesta_ms=elapsed,
                http_status=response.status_code,
            )
        if response.is_success:
            return HealthCheckResult.ok(tiempo_respuesta_ms=elapsed, phone_number_id=phone_id)
        return HealthCheckResult.degradado(
            f"Respuesta inesperada de Meta Cloud API ({response.status_code}).",
            tiempo_respuesta_ms=elapsed,
            http_status=response.status_code,
        )


class LeafletMapHealthChecker(_HttpHealthChecker):
    """Mapas con Leaflet: monitorea la disponibilidad de los tiles de OpenStreetMap."""

    service_key = "leaflet"
    _TILE_URL = "https://tile.openstreetmap.org/0/0/0.png"

    async def check(self) -> HealthCheckResult:
        response, elapsed, error = await self._timed_request(
            "GET",
            self._TILE_URL,
            headers={"User-Agent": "SafeCampus-PUCP/health-check"},
        )
        if error is not None:
            return HealthCheckResult.caido(
                "Servidor de tiles de OpenStreetMap no disponible.",
                tiempo_respuesta_ms=elapsed,
            )
        assert response is not None
        if response.is_success:
            return HealthCheckResult.ok(tiempo_respuesta_ms=elapsed, proveedor="OpenStreetMap")
        return HealthCheckResult.degradado(
            f"Tiles de OpenStreetMap respondieron {response.status_code}.",
            tiempo_respuesta_ms=elapsed,
            http_status=response.status_code,
        )
