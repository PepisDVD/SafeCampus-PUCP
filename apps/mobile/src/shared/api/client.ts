import type {
  AuthSession,
  DashboardStats,
  IncidentDetail,
  IncidentListResponse,
  IncidentStatus,
} from "../types/api";
import { apiFetch } from "./http-client";

export { ApiError } from "./http-client";

export function loginOperator(email: string, password: string) {
  return apiFetch<AuthSession>("/auth/mobile/operator/login", {
    method: "POST",
    body: { email, password },
  });
}

export function exchangeSupabaseSession(accessToken: string) {
  return apiFetch<AuthSession>("/auth/mobile/supabase-session", {
    method: "POST",
    body: { access_token: accessToken },
  });
}

export function getMe(token: string) {
  return apiFetch<AuthSession["user"]>("/auth/me", { token });
}

export function listIncidents(token: string) {
  return apiFetch<IncidentListResponse>("/incidentes/?limit=80", { token });
}

export function getIncident(token: string, incidentId: string) {
  return apiFetch<IncidentDetail>(`/incidentes/${incidentId}`, { token });
}

export function getDashboardStats(token: string) {
  return apiFetch<DashboardStats>("/incidentes/stats", { token });
}

export function updateIncidentStatus(
  token: string,
  incidentId: string,
  estado: IncidentStatus,
  comentario?: string,
) {
  return apiFetch<IncidentDetail>(`/incidentes/${incidentId}/estado`, {
    token,
    method: "PATCH",
    body: { estado, comentario },
  });
}

export function addIncidentComment(
  token: string,
  incidentId: string,
  contenido: string,
  esInterno = true,
) {
  return apiFetch(`/incidentes/${incidentId}/comentarios`, {
    token,
    method: "POST",
    body: { contenido, es_interno: esInterno },
  });
}
