import type {
  AlertaCreateInput,
  AlertaDetail,
  AlertaEstadoInput,
  AlertaPublishResponse,
  AlertaUpdateInput,
} from "@safecampus/shared-types";

import { api } from "@/lib/api/client";

export async function obtenerAlertaCliente(alertaId: string): Promise<AlertaDetail> {
  return api.get<AlertaDetail>(`/alertas/${encodeURIComponent(alertaId)}`);
}

export async function crearAlerta(body: AlertaCreateInput): Promise<AlertaDetail> {
  return api.post<AlertaDetail>("/alertas/", body);
}

export async function actualizarAlerta(alertaId: string, body: AlertaUpdateInput): Promise<AlertaDetail> {
  return api.patch<AlertaDetail>(`/alertas/${encodeURIComponent(alertaId)}`, body);
}

export async function publicarAlerta(alertaId: string): Promise<AlertaPublishResponse> {
  return api.post<AlertaPublishResponse>(`/alertas/${encodeURIComponent(alertaId)}/publicar`, {});
}

export async function cancelarAlerta(alertaId: string, body: AlertaEstadoInput = {}): Promise<AlertaDetail> {
  return api.post<AlertaDetail>(`/alertas/${encodeURIComponent(alertaId)}/cancelar`, body);
}

export async function finalizarAlerta(alertaId: string, body: AlertaEstadoInput = {}): Promise<AlertaDetail> {
  return api.post<AlertaDetail>(`/alertas/${encodeURIComponent(alertaId)}/finalizar`, body);
}
