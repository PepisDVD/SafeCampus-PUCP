import { EstadoIncidente, NivelSeveridad } from "@safecampus/shared-types";

export type WhatsAppQueue = "bot" | "humano" | "esperando" | "cerrado";
export type WhatsAppAuthor = "usuario" | "bot" | "operador" | "sistema";
export type WhatsAppDelivery = "sent" | "delivered" | "read" | "failed";
export type WhatsAppResolution = "bot" | "humano" | null;

export type WhatsAppLinkedIncident = {
  id: string;
  codigo: string;
  titulo: string;
  estado: EstadoIncidente;
  severidad: NivelSeveridad;
  zona: string;
};

export type WhatsAppMessage = {
  id: string;
  author: WhatsAppAuthor;
  text: string;
  createdAt: string;
  delivery: WhatsAppDelivery;
};

export type WhatsAppConversation = {
  id: string;
  waConversationId: string;
  contactName: string;
  phone: string;
  queue: WhatsAppQueue;
  unreadCount: number;
  priority: NivelSeveridad;
  assignedOperator: string | null;
  intent: string;
  botConfidence: number;
  sentimentScore: number;
  firstResponseSeconds: number;
  satisfactionScore: number | null;
  needsHumanHandoff: boolean;
  containsIncidentSignal: boolean;
  slaBreached: boolean;
  resolvedBy: WhatsAppResolution;
  lastMessage: string;
  lastActivityAt: string;
  aiSummary: string;
  recommendedPlaybook: string;
  tags: string[];
  linkedIncident: WhatsAppLinkedIncident | null;
  messages: WhatsAppMessage[];
};

export type WhatsAppQuickReply = {
  id: string;
  label: string;
  text: string;
};

export type OperatorLoad = {
  name: string;
  activeChats: number;
  waitingChats: number;
  escalatedCases: number;
};