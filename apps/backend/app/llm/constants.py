"""Shared constants for SafeCampus LLM workflows."""

from app.core.constants import NivelSeveridad

VALID_CATEGORIAS = {
    "VIOLENCIA",
    "ROBO_HURTO",
    "ACCIDENTE",
    "INCENDIO_EMERGENCIA",
    "DAÑO_INFRAESTRUCTURA",
    "COMPORTAMIENTO_SOSPECHOSO",
    "OBJETO_PERDIDO_ENCONTRADO",
    "OTRO",
}

CATEGORIA_FALLBACK_MAP = {
    "AGRESION": "VIOLENCIA",
    "HURTO": "ROBO_HURTO",
    "EMERGENCIA": "INCENDIO_EMERGENCIA",
    "VANDALISMO": "DAÑO_INFRAESTRUCTURA",
    "SOSPECHOSO": "COMPORTAMIENTO_SOSPECHOSO",
    "__default__": "OTRO",
}

SEVERIDAD_FALLBACK_MAP = {
    "URGENTE": NivelSeveridad.ALTO,
    "GRAVE": NivelSeveridad.ALTO,
    "LEVE": NivelSeveridad.BAJO,
    "MODERADO": NivelSeveridad.MEDIO,
    "__default__": NivelSeveridad.MEDIO,
}

CRITICAL_INDICATORS = {
    "arma",
    "cuchillo",
    "pistola",
    "disparo",
    "puñalada",
    "herido",
    "sangre",
    "inconsciente",
    "no respira",
    "fuego",
    "incendio",
    "explosion",
    "humo denso",
    "personas atrapadas",
    "multiples victimas",
}

HIGH_RISK_INDICATORS = {
    "amenaza",
    "pelea",
    "forcejeo",
    "gritos",
    "robo en progreso",
    "intrusos",
    "emergencia medica",
}

RETRYABLE_FALLBACKS = {"FB-01", "FB-02", "FB-05"}

DEFAULT_CLASSIFICATION_REASON = "Clasificacion por defecto. Requiere revision humana."
