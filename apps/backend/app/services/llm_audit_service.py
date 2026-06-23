"""
📁 apps/backend/app/services/llm_audit_service.py
🎯 Servicio de auditoría del consumo LLM del chatbot.
📦 Capa: Services
"""

import math

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.omnicanal_repository import OmnicanalRepository
from app.schemas.admin import (
    LlmUsageItemOut,
    LlmUsageListResponse,
    LlmUsageProviderStat,
    LlmUsageStatsResponse,
)


class LlmAuditService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = OmnicanalRepository(db)

    async def listar_uso(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        conversacion_id: str | None = None,
        providers: list[str] | None = None,
        desde: str | None = None,
        hasta: str | None = None,
    ) -> LlmUsageListResponse:
        items, total = await self._repo.list_llm_usage(
            page=page,
            page_size=page_size,
            conversacion_id=conversacion_id,
            providers=providers,
            desde=desde,
            hasta=hasta,
        )
        pages = math.ceil(total / page_size) if total > 0 else 1
        return LlmUsageListResponse(
            items=[
                LlmUsageItemOut(
                    id=str(item.id),
                    conversacion_id=str(item.conversacion_id),
                    incidente_id=str(item.incidente_id) if item.incidente_id else None,
                    correlation_id=item.correlation_id,
                    provider=item.provider,
                    model=item.model,
                    prompt_version=item.prompt_version,
                    prompt_tokens=item.prompt_tokens,
                    completion_tokens=item.completion_tokens,
                    total_tokens=item.total_tokens,
                    latency_ms=item.latency_ms,
                    fallback_applied=item.fallback_applied,
                    fallback_reason=item.fallback_reason,
                    created_at=item.created_at.isoformat(),
                )
                for item in items
            ],
            total=total,
            page=page,
            page_size=page_size,
            pages=pages,
        )

    async def obtener_stats(
        self,
        *,
        desde: str | None = None,
        hasta: str | None = None,
    ) -> LlmUsageStatsResponse:
        raw = await self._repo.get_llm_usage_stats(desde=desde, hasta=hasta)
        by_provider = [
            LlmUsageProviderStat(
                provider=p["provider"],
                total_calls=int(p["total_calls"] or 0),
                total_tokens=int(p["total_tokens"] or 0),
                prompt_tokens=int(p["prompt_tokens"] or 0),
                completion_tokens=int(p["completion_tokens"] or 0),
                avg_latency_ms=float(p["avg_latency_ms"]) if p.get("avg_latency_ms") else None,
                fallback_count=int(p["fallback_count"] or 0),
            )
            for p in raw["by_provider"]
        ]
        return LlmUsageStatsResponse(
            total_calls=raw["total_calls"],
            total_tokens=raw["total_tokens"],
            prompt_tokens=raw["prompt_tokens"],
            completion_tokens=raw["completion_tokens"],
            avg_latency_ms=raw["avg_latency_ms"],
            fallback_rate=raw["fallback_rate"],
            unique_conversations=raw["unique_conversations"],
            by_provider=by_provider,
            tokens_per_day=raw["tokens_per_day"],
        )

    async def listar_providers(self) -> list[str]:
        """Returns distinct providers that have usage records."""
        from sqlalchemy import select

        from app.models.sc_omnicanal import ChatbotLlmUsage

        stmt = (
            select(ChatbotLlmUsage.provider)
            .distinct()
            .order_by(ChatbotLlmUsage.provider)
        )
        result = await self._repo.db.execute(stmt)
        return [row[0] for row in result]
