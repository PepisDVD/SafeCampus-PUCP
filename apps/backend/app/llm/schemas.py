"""Typed contracts for prompting, provider responses, and classification output."""

from datetime import UTC, datetime
from enum import StrEnum
from pathlib import Path
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field

from app.core.constants import NivelSeveridad


class CategoriaIncidente(StrEnum):
    VIOLENCIA = "VIOLENCIA"
    ROBO_HURTO = "ROBO_HURTO"
    ACCIDENTE = "ACCIDENTE"
    INCENDIO_EMERGENCIA = "INCENDIO_EMERGENCIA"
    DAÑO_INFRAESTRUCTURA = "DAÑO_INFRAESTRUCTURA"
    COMPORTAMIENTO_SOSPECHOSO = "COMPORTAMIENTO_SOSPECHOSO"
    OBJETO_PERDIDO_ENCONTRADO = "OBJETO_PERDIDO_ENCONTRADO"
    OTRO = "OTRO"


class NivelSeveridadIA(StrEnum):
    CRITICO = NivelSeveridad.CRITICO
    ALTO = NivelSeveridad.ALTO
    MEDIO = NivelSeveridad.MEDIO
    BAJO = NivelSeveridad.BAJO


class LLMProviderName(StrEnum):
    OPENAI = "openai"
    GEMINI = "gemini"


class PromptMetadata(BaseModel):
    id: str
    tipo: str
    version_mayor: int
    version_menor: int
    fecha_creacion: str
    autor: str
    modelo_objetivo: str
    temperatura: float
    max_tokens: int
    estado: str
    proposito: str | None = None
    cambios: str | None = None
    casos_de_prueba: list[str] = Field(default_factory=list)
    aprobado_por: str | None = None
    fecha_aprobacion: str | None = None


class PromptTemplate(BaseModel):
    metadata: PromptMetadata
    system_message: str
    user_message_template: str
    variables_requeridas: list[str]
    output_schema_version: str
    source_path: Path | None = None

    model_config = ConfigDict(arbitrary_types_allowed=True)


class IncidentLLMContext(BaseModel):
    descripcion: str
    canal: str = "WHATSAPP"
    ubicacion: str = "No especificada"
    fecha_hora: str | None = None
    contexto_adicional: str = "Sin contexto adicional"
    incident_id: str | None = None
    correlation_id: str = Field(default_factory=lambda: str(uuid4()))

    def as_prompt_variables(self) -> dict[str, str]:
        return {
            "canal": self.canal,
            "descripcion": self.descripcion,
            "ubicacion": self.ubicacion,
            "fecha_hora": self.fecha_hora or datetime.now(UTC).isoformat(),
            "contexto_adicional": self.contexto_adicional,
        }


class LLMInvocationRequest(BaseModel):
    system_prompt: str
    user_prompt: str
    model: str
    temperature: float
    max_tokens: int
    correlation_id: str
    prompt_version: str
    incident_id: str | None = None


class LLMProviderResponse(BaseModel):
    provider: str
    model: str
    text: str
    latency_ms: int
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    raw_payload: dict[str, Any] = Field(default_factory=dict)


class LLMNormalizedResponse(BaseModel):
    categoria: CategoriaIncidente
    severidad: NivelSeveridadIA
    confidence_score: float = Field(ge=0.0, le=1.0)
    requires_human_review: bool
    indicadores_detectados: list[str] = Field(default_factory=list)
    razonamiento_breve: str = Field(max_length=120)
    version_prompt: str | None = None
    normalization_events: list[str] = Field(default_factory=list)


class ClasificacionFinal(BaseModel):
    categoria: CategoriaIncidente
    severidad: NivelSeveridadIA
    confidence_score: float
    requires_human_review: bool
    indicadores_detectados: list[str] = Field(default_factory=list)
    razonamiento_breve: str
    version_prompt: str | None = None
    fallback_applied: bool = False
    fallback_reason: str | None = None
    normalization_events: list[str] = Field(default_factory=list)
    business_rules_applied: list[str] = Field(default_factory=list)
    notification_required: bool = False
    incident_id: str | None = None
    correlation_id: str
    processing_timestamp: datetime
    model_used: str
    provider_used: LLMProviderName
    latency_ms: int | None = None
    raw_response_text: str | None = None


class ClassificationPipelineResult(BaseModel):
    normalized: LLMNormalizedResponse
    final: ClasificacionFinal
    provider_response: LLMProviderResponse | None = None