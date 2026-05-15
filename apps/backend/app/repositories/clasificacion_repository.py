"""Persistence helpers for sc_clasificacion records."""

from decimal import Decimal
from uuid import UUID

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import OrigenClasificacion
from app.llm.schemas import ClassificationPipelineResult
from app.models.sc_clasificacion import ClasificacionIa


class ClasificacionRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def upsert_llm_classification(
        self,
        *,
        incident_id: str,
        result: ClassificationPipelineResult,
    ) -> None:
        normalized = result.normalized
        final = result.final
        provider_response = result.provider_response
        statement = (
            insert(ClasificacionIa)
            .values(
                incidente_id=UUID(incident_id),
                categoria_sugerida=normalized.categoria,
                severidad_sugerida=normalized.severidad,
                confianza=Decimal(str(round(normalized.confidence_score, 4))),
                origen=(
                    OrigenClasificacion.FALLBACK
                    if final.fallback_applied
                    else OrigenClasificacion.IA
                ),
                modelo_utilizado=final.model_used,
                prompt_version=final.version_prompt,
                tokens_consumidos=provider_response.total_tokens if provider_response else 0,
                tiempo_respuesta_ms=final.latency_ms,
                respuesta_raw={
                    "normalized": normalized.model_dump(mode="json"),
                    "final": final.model_dump(mode="json"),
                    "provider_response": (
                        provider_response.model_dump(mode="json")
                        if provider_response
                        else None
                    ),
                },
                categoria_final=final.categoria,
                severidad_final=final.severidad,
            )
            .on_conflict_do_update(
                index_elements=[ClasificacionIa.incidente_id],
                set_={
                    "categoria_sugerida": normalized.categoria,
                    "severidad_sugerida": normalized.severidad,
                    "confianza": Decimal(str(round(normalized.confidence_score, 4))),
                    "origen": (
                        OrigenClasificacion.FALLBACK
                        if final.fallback_applied
                        else OrigenClasificacion.IA
                    ),
                    "modelo_utilizado": final.model_used,
                    "prompt_version": final.version_prompt,
                    "tokens_consumidos": provider_response.total_tokens if provider_response else 0,
                    "tiempo_respuesta_ms": final.latency_ms,
                    "respuesta_raw": {
                        "normalized": normalized.model_dump(mode="json"),
                        "final": final.model_dump(mode="json"),
                        "provider_response": (
                            provider_response.model_dump(mode="json")
                            if provider_response
                            else None
                        ),
                    },
                    "categoria_final": final.categoria,
                    "severidad_final": final.severidad,
                },
            )
        )
        await self.db.execute(statement)
        await self.db.flush()