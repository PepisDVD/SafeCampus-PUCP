import type {
  AuthSession,
  DashboardStats,
  IncidentDetail,
  IncidentListResponse,
  IncidentStatus,
  LostFoundCaseListResponse,
  LostFoundCategory,
  LostFoundCustodyListResponse,
  LostFoundReceptionPayload,
  LostFoundReceptionResult,
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

/** Solo los incidentes asignados al operador autenticado (`mios=true`). */
export function listIncidents(token: string) {
  return apiFetch<IncidentListResponse>("/incidentes/?mios=true&limit=80", { token });
}

export function getIncident(token: string, incidentId: string) {
  return apiFetch<IncidentDetail>(`/incidentes/${incidentId}`, { token });
}

/** Stats del dashboard limitadas a los incidentes asignados al operador (`mios=true`). */
export function getDashboardStats(token: string) {
  return apiFetch<DashboardStats>("/incidentes/stats?mios=true", { token });
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

export function getLostFoundAccess(token: string) {
  return apiFetch<{ acceso: boolean }>("/lost-found/acceso/mi", { token });
}

export function listLostFoundCategories(token: string) {
  return apiFetch<LostFoundCategory[]>("/lost-found/categorias", { token });
}

export function listLostFoundCustodies(token: string) {
  return apiFetch<LostFoundCustodyListResponse>(
    "/lost-found/custodias?estado=ACTIVA,PROXIMA_VENCER&page=1&per_page=80",
    { token },
  );
}

export function listMyLostFoundMobileRecords(token: string) {
  return apiFetch<LostFoundCaseListResponse>("/lost-found/casos/mis?origen=OPERADOR_MOVIL&limit=80", { token });
}

export function registerLostFoundMobileReception(token: string, body: LostFoundReceptionPayload) {
  return apiFetch<LostFoundReceptionResult>("/lost-found/mobile/recepciones", {
    token,
    method: "POST",
    body,
  });
}

export function uploadLostFoundCasePhotos(token: string, caseId: string, uris: string[]) {
  const form = new FormData();
  uris.forEach((uri, index) => {
    form.append("archivos", {
      uri,
      name: `recepcion-${Date.now()}-${index + 1}.jpg`,
      type: "image/jpeg",
    } as unknown as Blob);
  });
  return apiFetch(`/lost-found/casos/${caseId}/fotos/upload`, {
    token,
    method: "POST",
    body: form,
  });
}
