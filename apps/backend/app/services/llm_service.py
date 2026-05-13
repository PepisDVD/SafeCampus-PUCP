"""Application service for SafeCampus LLM classification workflows."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.orchestrator import LLMOrchestrator
from app.llm.schemas import (
    ClassificationPipelineResult,
    IncidentLLMContext,
    LLMProviderName,
)
from app.repositories.clasificacion_repository import ClasificacionRepository


class LLMService:
    def __init__(self, db: AsyncSession | None = None, *, orchestrator: LLMOrchestrator | None = None) -> None:
        self._db = db
        self._orchestrator = orchestrator or LLMOrchestrator()
        self._repo = ClasificacionRepository(db) if db is not None else None

    async def classify_context(
        self,
        context: IncidentLLMContext,
        *,
        provider: LLMProviderName | None = None,
        persist: bool = False,
    ) -> ClassificationPipelineResult:
        result = await self._orchestrator.classify(context, provider=provider)
        if persist and context.incident_id and self._repo is not None:
            await self._repo.upsert_llm_classification(
                incident_id=context.incident_id,
                result=result,
            )
        return result

    async def classify_whatsapp_message(
        self,
        *,
        descripcion: str,
        ubicacion: str = "No especificada",
        contexto_adicional: str = "Sin contexto adicional",
        incident_id: str | None = None,
        provider: LLMProviderName | None = None,
        persist: bool = False,
    ) -> ClassificationPipelineResult:
        context = IncidentLLMContext(
            descripcion=descripcion,
            canal="WHATSAPP",
            ubicacion=ubicacion,
            contexto_adicional=contexto_adicional,
            incident_id=incident_id,
        )
        return await self.classify_context(context, provider=provider, persist=persist)