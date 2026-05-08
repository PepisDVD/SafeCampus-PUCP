/**
 * Mutaciones client-side para notificaciones internas.
 */

import type {
  NotificacionListResponse,
  NotificacionUnreadCount,
} from "@safecampus/shared-types";

import { api } from "@/lib/api/client";

export async function marcarNotificacionLeida(id: string): Promise<void> {
  await api.patch<void>(`/notificaciones/${encodeURIComponent(id)}/leer`);
}

export async function marcarTodasNotificacionesLeidas(): Promise<NotificacionUnreadCount> {
  return api.patch<NotificacionUnreadCount>("/notificaciones/leer-todas");
}

export async function obtenerContadorNoLeidas(): Promise<NotificacionUnreadCount> {
  return api.get<NotificacionUnreadCount>("/notificaciones/no-leidas");
}

export async function listarNotificacionesClient(
  limit = 10,
): Promise<NotificacionListResponse> {
  return api.get<NotificacionListResponse>("/notificaciones/", {
    params: { limit: String(limit) },
  });
}
