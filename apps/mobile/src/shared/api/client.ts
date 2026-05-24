import { API_BASE_URL } from "../config/env";
import type {
  AuthSession,
  DashboardStats,
  IncidentDetail,
  IncidentListResponse,
  IncidentStatus,
} from "../types/api";

type RequestOptions = {
  token?: string | null;
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let message = "No se pudo completar la operacion.";
    try {
      const payload = (await response.json()) as { detail?: string };
      message = payload.detail ?? message;
    } catch {
      // Keep generic message.
    }
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

export function loginOperator(email: string, password: string) {
  return request<AuthSession>("/auth/mobile/operator/login", {
    method: "POST",
    body: { email, password },
  });
}

export function exchangeSupabaseSession(accessToken: string) {
  return request<AuthSession>("/auth/mobile/supabase-session", {
    method: "POST",
    body: { access_token: accessToken },
  });
}

export function getMe(token: string) {
  return request<AuthSession["user"]>("/auth/me", { token });
}

export function listIncidents(token: string) {
  return request<IncidentListResponse>("/incidentes/?limit=80", { token });
}

export function getIncident(token: string, incidentId: string) {
  return request<IncidentDetail>(`/incidentes/${incidentId}`, { token });
}

export function getDashboardStats(token: string) {
  return request<DashboardStats>("/incidentes/stats", { token });
}

export function updateIncidentStatus(
  token: string,
  incidentId: string,
  estado: IncidentStatus,
  comentario?: string,
) {
  return request<IncidentDetail>(`/incidentes/${incidentId}/estado`, {
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
  return request(`/incidentes/${incidentId}/comentarios`, {
    token,
    method: "POST",
    body: { contenido, es_interno: esInterno },
  });
}
