"""Schemas for omnichannel WhatsApp operations."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

ConversacionEstado = Literal["ABIERTA", "EN_BOT", "EN_COLA", "EN_ATENCION", "CERRADA"]
ModoAtencion = Literal["BOT", "HUMANO"]
PrioridadConversacion = Literal["BAJO", "MEDIO", "ALTO", "CRITICO"]
DireccionMensaje = Literal["INBOUND", "OUTBOUND"]
AutorMensaje = Literal["CONTACTO", "BOT", "OPERADOR", "SISTEMA"]
ChatbotStatus = Literal[
    "BOT_NEW",
    "BOT_COLLECTING",
    "BOT_INCIDENT_DRAFTED",
    "BOT_ESCALATED",
    "HUMAN_ACTIVE",
    "BOT_PAUSED",
]


class ChatbotConversationStateOut(BaseModel):
    bot_status: ChatbotStatus
    last_intent: str | None = None
    last_action: str | None = None
    requires_human_review: bool = False
    handoff_reason: str | None = None
    ai_summary: str | None = None
    classification_category: str | None = None
    classification_severity: str | None = None
    classification_confidence: float | None = None
    missing_fields: list[str] = Field(default_factory=list)
    incident_draft: dict = Field(default_factory=dict)
    suggested_reply: str | None = None
    last_bot_reply: str | None = None
    last_user_message_at: datetime | None = None
    last_bot_message_at: datetime | None = None
    last_processed_at: datetime | None = None


class ReporteEntranteCreated(BaseModel):
    id: str
    canal_id: str
    provider: str
    external_message_id: str | None = None
    sender_phone: str | None = None
    message_type: str
    estado: str
    created_at: datetime | None = None


class WhatsAppWebhookResponse(BaseModel):
    ok: bool = True
    ignored: bool = False
    reporte: ReporteEntranteCreated | None = None
    detail: str = Field(default="Reporte entrante registrado.")


class UsuarioConversacionOut(BaseModel):
    id: str
    nombre_completo: str
    email: str | None = None
    avatar_url: str | None = None


class IncidenteConversacionOut(BaseModel):
    id: str
    codigo: str
    titulo: str
    estado: str
    severidad: str | None = None


class MensajeConversacionOut(BaseModel):
    id: str
    conversacion_id: str
    external_message_id: str | None = None
    direccion: DireccionMensaje
    autor_tipo: AutorMensaje
    autor_usuario: UsuarioConversacionOut | None = None
    contenido: str | None = None
    tipo_contenido: str
    estado_entrega: str
    created_at: datetime


class ConversacionListItem(BaseModel):
    id: str
    canal_id: str
    external_chat_id: str
    telefono_contacto: str | None = None
    nombre_contacto: str | None = None
    estado: ConversacionEstado
    modo_atencion: ModoAtencion
    prioridad: PrioridadConversacion
    operador_asignado: UsuarioConversacionOut | None = None
    tomado_por: UsuarioConversacionOut | None = None
    incidente: IncidenteConversacionOut | None = None
    chatbot: ChatbotConversationStateOut | None = None
    ultimo_mensaje_preview: str | None = None
    ultimo_mensaje_at: datetime
    unread_count: int = 0
    created_at: datetime
    updated_at: datetime


class ConversacionListResponse(BaseModel):
    items: list[ConversacionListItem]
    total: int


class ConversacionDetail(ConversacionListItem):
    metadatos: dict = Field(default_factory=dict)


class MensajesConversacionResponse(BaseModel):
    items: list[MensajeConversacionOut]


class EventoConversacionOut(BaseModel):
    id: str
    conversacion_id: str
    tipo_evento: str
    actor_usuario: UsuarioConversacionOut | None = None
    payload: dict = Field(default_factory=dict)
    created_at: datetime


class EventosConversacionResponse(BaseModel):
    items: list[EventoConversacionOut]


class EnviarMensajeInput(BaseModel):
    contenido: str = Field(min_length=1, max_length=4000)


class AsignarConversacionInput(BaseModel):
    operador_id: str


class CerrarConversacionInput(BaseModel):
    motivo: str | None = Field(default=None, max_length=1000)


class VincularIncidenteInput(BaseModel):
    incidente_id: str


class CrearIncidenteConversacionInput(BaseModel):
    titulo: str | None = Field(default=None, max_length=200)
    descripcion: str | None = Field(default=None, max_length=4000)
    severidad: str | None = Field(default=None, pattern="^(BAJO|MEDIO|ALTO|CRITICO)$")
    categoria: str | None = Field(default=None, max_length=100)
    lugar_referencia: str | None = Field(default=None, max_length=255)


class ChatbotBorradorUpdateInput(BaseModel):
    ai_summary: str | None = Field(default=None, max_length=4000)
    titulo: str | None = Field(default=None, max_length=200)
    descripcion: str | None = Field(default=None, max_length=4000)
    severidad: str | None = Field(default=None, pattern="^(BAJO|MEDIO|ALTO|CRITICO)$")
    categoria: str | None = Field(default=None, max_length=100)
    lugar_referencia: str | None = Field(default=None, max_length=255)


class OmnicanalRealtimeEvent(BaseModel):
    type: str
    conversacion_id: str | None = None
    payload: dict = Field(default_factory=dict)


class OmnicanalStats(BaseModel):
    en_bot: int
    en_cola: int
    en_atencion: int
    abierta: int
    total_activos: int
