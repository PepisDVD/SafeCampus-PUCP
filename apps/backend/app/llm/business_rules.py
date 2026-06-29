"""Business rule enrichment after LLM normalization."""

from app.llm.constants import CRITICAL_INDICATORS, HIGH_RISK_INDICATORS
from app.llm.schemas import ClasificacionFinal, NivelSeveridadIA


class BusinessRulesEngine:
    def apply(self, classification: ClasificacionFinal, *, descripcion: str) -> ClasificacionFinal:
        lowered = descripcion.lower()
        applied_rules = list(classification.business_rules_applied)

        if any(indicator in lowered for indicator in CRITICAL_INDICATORS):
            classification.severidad = NivelSeveridadIA.CRITICO
            applied_rules.append("BR-SEV-01")
        elif any(
            indicator in lowered for indicator in HIGH_RISK_INDICATORS
        ) and classification.severidad in {NivelSeveridadIA.BAJO, NivelSeveridadIA.MEDIO}:
            classification.severidad = NivelSeveridadIA.ALTO
            applied_rules.append("BR-SEV-02")

        if classification.confidence_score < 0.60:
            classification.requires_human_review = True
            applied_rules.append("BR-HUM-01")

        if (
            classification.severidad == NivelSeveridadIA.CRITICO
            and classification.confidence_score < 0.80
        ):
            classification.requires_human_review = True
            applied_rules.append("BR-HUM-02")

        if classification.severidad in {NivelSeveridadIA.CRITICO, NivelSeveridadIA.ALTO}:
            classification.notification_required = True
            applied_rules.append("BR-NOT-01")

        classification.business_rules_applied = list(dict.fromkeys(applied_rules))
        return classification
