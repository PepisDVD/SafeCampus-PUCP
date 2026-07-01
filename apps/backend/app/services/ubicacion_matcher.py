"""Resolución de menciones de lugar (texto libre) contra el maestro de
ubicaciones (`sc_maestros.ubicacion_maestra`).

El chatbot extrae una mención de ubicación del mensaje; este matcher la resuelve
a una ubicación registrada para usar su **nombre canónico** y **coordenadas**
(así el incidente del bot queda geolocalizado en el mapa).

Decisiones de diseño (ver conversación de optimización):
- El match corre en el backend con el catálogo **cacheado en memoria** (cambia
  rara vez), para no agregar un round-trip a Supabase por cada mensaje.
- Matching determinista con la stdlib (normalización sin tildes + `difflib`),
  suficiente y robusto para decenas de ubicaciones. Umbral conservador: ante la
  duda no se resuelve y se cae al texto libre.
"""

from __future__ import annotations

import logging
import math
import time
import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Any

from app.repositories.maestros_repository import MaestrosRepository

logger = logging.getLogger(__name__)

# El catálogo se recarga como máximo cada estos segundos.
_CACHE_TTL_SECONDS = 300.0
# Umbral mínimo de confianza para aceptar un match (0..1). Conservador a
# propósito: preferimos no geolocalizar a geolocalizar mal.
_DEFAULT_THRESHOLD = 0.78
# Margen mínimo respecto al segundo candidato para evitar matches ambiguos.
_AMBIGUITY_MARGIN = 0.08
# Radio máximo (km) para asociar un GPS a una ubicación maestra por cercanía.
_MAX_MATCH_KM = 0.15


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distancia en kilómetros entre dos puntos (lat/lng en grados)."""
    radius = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(a))


_STOPWORDS = frozenset({"de", "del", "la", "el", "los", "las", "en", "y", "a"})

# Cache de proceso del catálogo de ubicaciones activas.
_catalog_cache: list[dict[str, Any]] | None = None
_catalog_loaded_at: float = 0.0


@dataclass(frozen=True)
class UbicacionMatch:
    id: str
    nombre: str
    latitud: float
    longitud: float
    score: float


def _strip_accents(value: str) -> str:
    return unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")


def normalize(value: str) -> str:
    """Minúsculas, sin tildes, solo alfanumérico y espacios colapsados."""
    lowered = _strip_accents(value or "").lower()
    cleaned = "".join(ch if (ch.isalnum() or ch.isspace()) else " " for ch in lowered)
    return " ".join(cleaned.split())


def _tokens(value: str) -> set[str]:
    return {t for t in normalize(value).split() if t and t not in _STOPWORDS}


def _score(message_norm: str, message_tokens: set[str], candidate: str) -> float:
    candidate_norm = normalize(candidate)
    if not candidate_norm:
        return 0.0
    # 1) El nombre del maestro aparece literal dentro del mensaje.
    if candidate_norm in message_norm:
        return 1.0
    candidate_tokens = [t for t in candidate_norm.split() if t not in _STOPWORDS]
    if not candidate_tokens:
        return 0.0
    # 2) Cobertura: fracción de tokens del nombre presentes en el mensaje.
    covered = sum(1 for t in candidate_tokens if t in message_tokens)
    coverage = covered / len(candidate_tokens)
    # 3) Similitud difusa del bloque (tolera typos).
    ratio = SequenceMatcher(None, candidate_norm, message_norm).ratio()
    return max(coverage, ratio)


def match_location(
    text: str,
    catalog: list[dict[str, Any]],
    *,
    threshold: float = _DEFAULT_THRESHOLD,
) -> UbicacionMatch | None:
    """Devuelve la mejor ubicación del catálogo para `text`, o None.

    `catalog` son dicts con: id, codigo, nombre, latitud, longitud.
    """
    message_norm = normalize(text)
    if not message_norm:
        return None
    message_tokens = _tokens(text)

    best: UbicacionMatch | None = None
    second_score = 0.0
    for loc in catalog:
        score = max(
            _score(message_norm, message_tokens, loc["nombre"]),
            _score(message_norm, message_tokens, loc.get("codigo", "")),
        )
        if best is None or score > best.score:
            second_score = best.score if best else 0.0
            best = UbicacionMatch(
                id=str(loc["id"]),
                nombre=loc["nombre"],
                latitud=float(loc["latitud"]),
                longitud=float(loc["longitud"]),
                score=score,
            )
        elif score > second_score:
            second_score = score

    if best is None or best.score < threshold:
        return None
    # Match no literal y demasiado parejo con el segundo => ambiguo, no resolver.
    if best.score < 1.0 and (best.score - second_score) < _AMBIGUITY_MARGIN:
        return None
    return best


class UbicacionMatcher:
    """Resuelve menciones de lugar usando el catálogo cacheado en memoria."""

    def __init__(self, repo: MaestrosRepository) -> None:
        self._repo = repo

    async def resolve(self, text: str | None) -> UbicacionMatch | None:
        if not text or not text.strip():
            return None
        catalog = await self._safe_catalog()
        if not catalog:
            return None
        return match_location(text, catalog)

    async def resolve_by_coords(
        self, latitud: float, longitud: float, *, max_km: float = _MAX_MATCH_KM
    ) -> UbicacionMatch | None:
        """Ubicación maestra más cercana al GPS dado, si está dentro de max_km."""
        catalog = await self._safe_catalog()
        if not catalog:
            return None
        best: dict[str, Any] | None = None
        best_km: float | None = None
        for loc in catalog:
            distance = _haversine_km(latitud, longitud, loc["latitud"], loc["longitud"])
            if best_km is None or distance < best_km:
                best_km = distance
                best = loc
        if best is None or best_km is None or best_km > max_km:
            return None
        return UbicacionMatch(
            id=str(best["id"]),
            nombre=best["nombre"],
            latitud=float(best["latitud"]),
            longitud=float(best["longitud"]),
            score=1.0,
        )

    async def _safe_catalog(self) -> list[dict[str, Any]]:
        try:
            return await self._get_catalog()
        except Exception:
            # La geolocalización es un enriquecimiento opcional: si el catálogo
            # no se puede cargar, el chatbot sigue con el texto libre.
            logger.warning(
                "No se pudo cargar el catálogo de ubicaciones para matching.",
                exc_info=True,
            )
            return []

    async def _get_catalog(self) -> list[dict[str, Any]]:
        global _catalog_cache, _catalog_loaded_at
        now = time.monotonic()
        if _catalog_cache is not None and (now - _catalog_loaded_at) < _CACHE_TTL_SECONDS:
            return _catalog_cache
        _catalog_cache = await self._repo.list_ubicaciones_para_matching()
        _catalog_loaded_at = now
        return _catalog_cache
