export type ConversationState =
  | "ABIERTA"
  | "EN_BOT"
  | "EN_COLA"
  | "EN_ATENCION"
  | "CERRADA";

export type AttentionMode = "BOT" | "HUMANO";
export type ConversationPriority = "BAJO" | "MEDIO" | "ALTO" | "CRITICO";
export type MessageDirection = "INBOUND" | "OUTBOUND";
export type MessageAuthor = "CONTACTO" | "BOT" | "OPERADOR" | "SISTEMA";
export type ChatbotStatus =
  | "BOT_NEW"
  | "BOT_COLLECTING"
  | "BOT_INCIDENT_DRAFTED"
  | "BOT_ESCALATED"
  | "HUMAN_ACTIVE"
  | "BOT_PAUSED";

export type ConversationUser = {
  id: string;
  nombre_completo: string;
  email?: string | null;
  avatar_url?: string | null;
};

export type ConversationIncident = {
  id: string;
  codigo: string;
  titulo: string;
  estado: string;
  severidad?: string | null;
};

export type ConversationChatbotState = {
  bot_status: ChatbotStatus;
  last_intent?: string | null;
  last_action?: string | null;
  requires_human_review: boolean;
  handoff_reason?: string | null;
  ai_summary?: string | null;
  classification_category?: string | null;
  classification_severity?: string | null;
  classification_confidence?: number | null;
  missing_fields: string[];
  incident_draft: Record<string, unknown>;
  suggested_reply?: string | null;
  last_bot_reply?: string | null;
  last_user_message_at?: string | null;
  last_bot_message_at?: string | null;
  last_processed_at?: string | null;
};

export type Conversation = {
  id: string;
  canal_id: string;
  external_chat_id: string;
  telefono_contacto?: string | null;
  nombre_contacto?: string | null;
  estado: ConversationState;
  modo_atencion: AttentionMode | null;
  prioridad: ConversationPriority | null;
  operador_asignado?: ConversationUser | null;
  operadores_asignados: ConversationUser[];
  tomado_por?: ConversationUser | null;
  incidente?: ConversationIncident | null;
  ultimo_incidente?: ConversationIncident | null;
  historico_incidentes_count: number;
  chatbot?: ConversationChatbotState | null;
  ultimo_mensaje_preview?: string | null;
  ultimo_mensaje_autor_tipo?: MessageAuthor | null;
  ultimo_mensaje_at: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
};

export type ConversationListResponse = {
  items: Conversation[];
  total: number;
};

export type ConversationHistoryListItem = {
  id: string;
  nombre_contacto?: string | null;
  telefono_contacto?: string | null;
  external_chat_id: string;
  estado: ConversationState;
  ultimo_mensaje_at: string;
  incidentes_count: number;
};

export type ConversationHistoryListResponse = {
  items: ConversationHistoryListItem[];
  total: number;
};

export type ConversationIncidentHistoryItem = {
  id: string;
  incidente: ConversationIncident | null;
  actor_usuario?: ConversationUser | null;
  actor_tipo: string;
  tipo_asociacion: string;
  asociado_at: string;
  finalizado_at?: string | null;
  motivo_finalizacion?: string | null;
};

export type ConversationHistoryDetail = {
  conversacion: Conversation;
  incidentes: ConversationIncidentHistoryItem[];
};

export type ConversationMessage = {
  id: string;
  conversacion_id: string;
  ciclo_id?: string | null;
  external_message_id?: string | null;
  direccion: MessageDirection;
  autor_tipo: MessageAuthor;
  autor_usuario?: ConversationUser | null;
  contenido?: string | null;
  tipo_contenido: string;
  estado_entrega: string;
  media?: {
    url?: string | null;
    data_url?: string | null;
    thumbnail_data_url?: string | null;
    mimetype?: string | null;
    filename?: string | null;
    caption?: string | null;
  } | null;
  created_at: string;
};

export type ConversationMessagesResponse = {
  items: ConversationMessage[];
};

export type RealtimeEvent = {
  type: string;
  conversacion_id?: string | null;
  payload?: Record<string, unknown>;
};

export type ConversationCycleSummary = {
  id: string;
  nombre_contacto?: string | null;
  telefono_contacto?: string | null;
  external_chat_id: string;
  ciclos_count: number;
  ultimo_ciclo_at?: string | null;
};

export type ConversationCyclesListResponse = {
  items: ConversationCycleSummary[];
  total: number;
};

export type ConversationCycleListItem = {
  id: string;
  conversacion_id: string;
  incidente?: ConversationIncident | null;
  estado: "ACTIVO" | "CERRADO";
  cierre_tipo: string;
  cierre_motivo?: string | null;
  mensajes_count: number;
  imagenes_count: number;
  started_at: string;
  closed_at?: string | null;
  cerrado_por?: ConversationUser | null;
};

export type ConversationCyclesDetail = {
  conversacion: ConversationCycleSummary;
  ciclos: ConversationCycleListItem[];
};

export type ConversationEvent = {
  id: string;
  conversacion_id: string;
  ciclo_id?: string | null;
  tipo_evento: string;
  actor_usuario?: ConversationUser | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export type ConversationCycleDetail = {
  ciclo: ConversationCycleListItem;
  mensajes: ConversationMessage[];
  eventos: ConversationEvent[];
  chatbot_snapshot: Record<string, unknown>;
  clasificacion_snapshot: Record<string, unknown>;
  asignaciones_snapshot: Record<string, unknown>[];
  metadatos: Record<string, unknown>;
};
