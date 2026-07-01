"""Schemas for omnichannel WhatsApp operations."""

from datetime import datetime
from typing import Any, Literal

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
    incident_draft: dict[str, Any] = Field(default_factory=dict)
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


class MensajeMediaOut(BaseModel):
    url: str | None = None
    data_url: str | None = None
    thumbnail_data_url: str | None = None
    mimetype: str | None = None
    filename: str | None = None
    caption: str | None = None


class MensajeConversacionOut(BaseModel):
    id: str
    conversacion_id: str
    ciclo_id: str | None = None
    external_message_id: str | None = None
    direccion: DireccionMensaje
    autor_tipo: AutorMensaje
    autor_usuario: UsuarioConversacionOut | None = None
    contenido: str | None = None
    tipo_contenido: str
    estado_entrega: str
    media: MensajeMediaOut | None = None
    created_at: datetime


class ConversacionListItem(BaseModel):
    id: str
    canal_id: str
    external_chat_id: str
    telefono_contacto: str | None = None
    nombre_contacto: str | None = None
    estado: ConversacionEstado
    modo_atencion: ModoAtencion | None = None
    prioridad: PrioridadConversacion | None = None
    operador_asignado: UsuarioConversacionOut | None = None
    operadores_asignados: list[UsuarioConversacionOut] = Field(default_factory=list)
    tomado_por: UsuarioConversacionOut | None = None
    incidente: IncidenteConversacionOut | None = None
    ultimo_incidente: IncidenteConversacionOut | None = None
    historico_incidentes_count: int = 0
    chatbot: ChatbotConversationStateOut | None = None
    ultimo_mensaje_preview: str | None = None
    ultimo_mensaje_autor_tipo: AutorMensaje | None = None
    ultimo_mensaje_at: datetime
    unread_count: int = 0
    created_at: datetime
    updated_at: datetime


class ConversacionListResponse(BaseModel):
    items: list[ConversacionListItem]
    total: int


class ConversacionDetail(ConversacionListItem):
    metadatos: dict[str, Any] = Field(default_factory=dict)


class ConversacionHistorialListItem(BaseModel):
    id: str
    nombre_contacto: str | None = None
    telefono_contacto: str | None = None
    external_chat_id: str
    estado: ConversacionEstado
    ultimo_mensaje_at: datetime
    incidentes_count: int = 0


class ConversacionesHistorialResponse(BaseModel):
    items: list[ConversacionHistorialListItem]
    total: int


class IncidenteHistorialConversacionOut(BaseModel):
    id: str
    incidente: IncidenteConversacionOut | None = None
    actor_usuario: UsuarioConversacionOut | None = None
    actor_tipo: str
    tipo_asociacion: str
    asociado_at: datetime
    finalizado_at: datetime | None = None
    motivo_finalizacion: str | None = None


class ConversacionHistorialDetail(BaseModel):
    conversacion: ConversacionDetail
    incidentes: list[IncidenteHistorialConversacionOut]


class ConversacionCicloListItem(BaseModel):
    id: str
    conversacion_id: str
    incidente: IncidenteConversacionOut | None = None
    estado: Literal["ACTIVO", "CERRADO"]
    cierre_tipo: str
    cierre_motivo: str | None = None
    mensajes_count: int = 0
    imagenes_count: int = 0
    started_at: datetime
    closed_at: datetime | None = None
    cerrado_por: UsuarioConversacionOut | None = None


class ConversacionCiclosResumen(BaseModel):
    id: str
    nombre_contacto: str | None = None
    telefono_contacto: str | None = None
    external_chat_id: str
    ciclos_count: int = 0
    ultimo_ciclo_at: datetime | None = None


class ConversacionCiclosListResponse(BaseModel):
    items: list[ConversacionCiclosResumen]
    total: int


class ConversacionCiclosDetail(BaseModel):
    conversacion: ConversacionCiclosResumen
    ciclos: list[ConversacionCicloListItem]


class ConversacionCicloDetail(BaseModel):
    ciclo: ConversacionCicloListItem
    mensajes: list[MensajeConversacionOut]
    eventos: list["EventoConversacionOut"]
    chatbot_snapshot: dict[str, Any] = Field(default_factory=dict)
    clasificacion_snapshot: dict[str, Any] = Field(default_factory=dict)
    asignaciones_snapshot: list[dict[str, Any]] = Field(default_factory=list)
    metadatos: dict[str, Any] = Field(default_factory=dict)


class MensajesConversacionResponse(BaseModel):
    items: list[MensajeConversacionOut]


class EventoConversacionOut(BaseModel):
    id: str
    conversacion_id: str
    ciclo_id: str | None = None
    tipo_evento: str
    actor_usuario: UsuarioConversacionOut | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class EventosConversacionResponse(BaseModel):
    items: list[EventoConversacionOut]


class EnviarMensajeInput(BaseModel):
    contenido: str = Field(min_length=1, max_length=4000)


class AsignarConversacionInput(BaseModel):
    operador_id: str | None = None
    operador_ids: list[str] | None = Field(default=None, max_length=12)


class CerrarConversacionInput(BaseModel):
    motivo: str | None = Field(default=None, max_length=1000)
    mensaje_cierre: str | None = Field(default=None, max_length=1000)


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
    payload: dict[str, Any] = Field(default_factory=dict)


class OmnicanalStats(BaseModel):
    en_bot: int
    en_cola: int
    en_atencion: int
    abierta: int
    total_activos: int


ConversacionCicloDetail.model_rebuild()
