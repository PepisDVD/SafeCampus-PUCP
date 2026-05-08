/**
 * Cliente server-side del feature Notificaciones.
 * La web consume FastAPI; no accede directamente a la BD.
 */

import "server-only";

import type {
  NotificacionListResponse,
  NotificacionUnreadCount,
} from "@safecampus/shared-types";

import { serverApi } from "@/lib/api/server";

export async function listarNotificaciones(
  limit = 30,
  unreadOnly = false,
): Promise<NotificacionListResponse> {
  return serverApi.get<NotificacionListResponse>("/notificaciones/", {
    limit: String(limit),
    unread_only: String(unreadOnly),
  });
}

export async function contarNotificacionesNoLeidas(): Promise<NotificacionUnreadCount> {
  return serverApi.get<NotificacionUnreadCount>("/notificaciones/no-leidas");
}
