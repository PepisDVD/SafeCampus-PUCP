/**
 * Contratos compartidos del modulo de notificaciones internas.
 */

import { CanalNotificacion, EstadoNotificacion } from "./enums";

export interface NotificacionItem {
  id: string;
  incidente_id: string | null;
  tipo_evento: string;
  canal: CanalNotificacion;
  estado: EstadoNotificacion;
  asunto: string | null;
  contenido: string;
  fecha_envio: string | null;
  fecha_lectura: string | null;
  created_at: string;
}

export interface NotificacionListResponse {
  items: NotificacionItem[];
  total: number;
  unread_count: number;
}

export interface NotificacionUnreadCount {
  unread_count: number;
}
