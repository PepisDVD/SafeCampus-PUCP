"""Normalization and fallback handling for raw LLM responses."""

import json
from datetime import UTC, datetime
from typing import Any

from app.llm.constants import (
    CATEGORIA_FALLBACK_MAP,
    DEFAULT_CLASSIFICATION_REASON,
    SEVERIDAD_FALLBACK_MAP,
)
from app.llm.exceptions import LLMOutputParsingError
from app.llm.schemas import (
    CategoriaIncidente,
    ClasificacionFinal,
    IncidentLLMContext,
    LLMNormalizedResponse,
    LLMProviderName,
    NivelSeveridadIA,
)


class LLMResponseNormalizer:
    def normalize(self, payload_text: str) -> LLMNormalizedResponse:
        try:
            payload = json.loads(self._strip_code_fences(payload_text))
        except json.JSONDecodeError as exc:
            raise LLMOutputParsingError("FB-05", "LLM response was not valid JSON.") from exc
        if not isinstance(payload, dict):
            raise LLMOutputParsingError("FB-05", "LLM response must be a JSON object.")

        normalization_events: list[str] = []
        categoria = self._normalize_categoria(payload.get("categoria"), normalization_events)
        severidad = self._normalize_severidad(payload.get("severidad"), normalization_events)
        confidence_score = self._normalize_confidence(payload.get("confidence_score"))
        if payload.get("confidence_score") != confidence_score:
            normalization_events.append("FB-06:confidence_score_clamped")
        requires_human_review = payload.get("requires_human_review")
        if not isinstance(requires_human_review, bool):
            requires_human_review = True
            normalization_events.append("FB-06:requires_human_review_normalized")
        razonamiento = str(payload.get("razonamiento_breve") or DEFAULT_CLASSIFICATION_REASON)
        if len(razonamiento) > 120:
            razonamiento = razonamiento[:120]
            normalization_events.append("FB-06:razonamiento_breve_truncated")

        indicadores = payload.get("indicadores_detectados")
        if not isinstance(indicadores, list):
            indicadores = []
            normalization_events.append("FB-06:indicadores_detectados_normalized")

        version_prompt = payload.get("version_prompt")
        if version_prompt is None:
            normalization_events.append("FB-06:version_prompt_missing")

        return LLMNormalizedResponse(
            categoria=categoria,
            severidad=severidad,
            confidence_score=confidence_score,
            requires_human_review=requires_human_review,
            indicadores_detectados=[str(item) for item in indicadores],
            razonamiento_breve=razonamiento,
            version_prompt=str(version_prompt) if version_prompt is not None else None,
            normalization_events=normalization_events,
        )

    def default_classification(
        self,
        *,
        context: IncidentLLMContext,
        provider: LLMProviderName,
        model_used: str,
        fallback_reason: str,
        latency_ms: int | None = None,
    ) -> ClasificacionFinal:
        return ClasificacionFinal(
            categoria=CategoriaIncidente.OTRO,
            severidad=NivelSeveridadIA.MEDIO,
            confidence_score=0.0,
            requires_human_review=True,
            indicadores_detectados=[],
            razonamiento_breve=DEFAULT_CLASSIFICATION_REASON,
            version_prompt=None,
            fallback_applied=True,
            fallback_reason=fallback_reason,
            normalization_events=[],
            business_rules_applied=[],
            notification_required=False,
            incident_id=context.incident_id,
            correlation_id=context.correlation_id,
            processing_timestamp=datetime.now(UTC),
            model_used=model_used,
            provider_used=provider,
            latency_ms=latency_ms,
        )

    def build_final(
        self,
        *,
        normalized: LLMNormalizedResponse,
        context: IncidentLLMContext,
        provider: LLMProviderName,
        model_used: str,
        raw_response_text: str,
        latency_ms: int,
    ) -> ClasificacionFinal:
        return ClasificacionFinal(
            categoria=normalized.categoria,
            severidad=normalized.severidad,
            confidence_score=normalized.confidence_score,
            requires_human_review=normalized.requires_human_review,
            indicadores_detectados=normalized.indicadores_detectados,
            razonamiento_breve=normalized.razonamiento_breve,
            version_prompt=normalized.version_prompt,
            normalization_events=normalized.normalization_events,
            incident_id=context.incident_id,
            correlation_id=context.correlation_id,
            processing_timestamp=datetime.now(UTC),
            model_used=model_used,
            provider_used=provider,
            latency_ms=latency_ms,
            raw_response_text=raw_response_text,
        )

    def _normalize_categoria(
        self,
        raw_value: Any,
        normalization_events: list[str],
    ) -> CategoriaIncidente:
        if isinstance(raw_value, str):
            normalized = raw_value.strip().upper()
            if normalized in CategoriaIncidente:
                return CategoriaIncidente(normalized)
            mapped = CATEGORIA_FALLBACK_MAP.get(normalized, CATEGORIA_FALLBACK_MAP["__default__"])
            normalization_events.append("FB-07:categoria_normalized")
            return CategoriaIncidente(mapped)
        normalization_events.append("FB-06:categoria_missing")
        return CategoriaIncidente.OTRO

    def _normalize_severidad(
        self,
        raw_value: Any,
        normalization_events: list[str],
    ) -> NivelSeveridadIA:
        if isinstance(raw_value, str):
            normalized = raw_value.strip().upper()
            if normalized in NivelSeveridadIA:
                return NivelSeveridadIA(normalized)
            mapped = SEVERIDAD_FALLBACK_MAP.get(normalized, SEVERIDAD_FALLBACK_MAP["__default__"])
            normalization_events.append("FB-07:severidad_normalized")
            return NivelSeveridadIA(mapped)
        normalization_events.append("FB-06:severidad_missing")
        return NivelSeveridadIA(NivelSeveridadIA.MEDIO)

    def _normalize_confidence(self, value: Any) -> float:
        try:
            parsed = float(value)
        except (TypeError, ValueError):
            return 0.0
        return max(0.0, min(parsed, 1.0))

    def _strip_code_fences(self, payload_text: str) -> str:
        text = payload_text.strip()
        if text.startswith("```") and text.endswith("```"):
            lines = text.splitlines()
            return "\n".join(lines[1:-1]).strip()
        return text
