import "server-only";

import type {
  AlertaDestinatariosResponse,
  AlertaDetail,
  AlertaListResponse,
  AlertasStatsResponse,
  GisHeatmapResponse,
  GisNearbyResponse,
  GisRouteResponse,
} from "@safecampus/shared-types";

import { serverApi } from "@/lib/api/server";

export type AlertaListFilters = {
  search?: string;
  estado?: string;
  severidad?: string;
  limit?: number;
};

export async function listarAlertas(filters: AlertaListFilters = {}): Promise<AlertaListResponse> {
  const params: Record<string, string> = {
    limit: String(filters.limit ?? 100),
  };
  if (filters.search) params.search = filters.search;
  if (filters.estado) params.estado = filters.estado;
  if (filters.severidad) params.severidad = filters.severidad;
  return serverApi.get<AlertaListResponse>("/alertas/", params);
}

export async function obtenerAlerta(alertaId: string): Promise<AlertaDetail> {
  return serverApi.get<AlertaDetail>(`/alertas/${encodeURIComponent(alertaId)}`);
}

export async function obtenerAlertasStats(): Promise<AlertasStatsResponse> {
  return serverApi.get<AlertasStatsResponse>("/alertas/stats");
}

export async function listarDestinatarios(filters: { search?: string; limit?: number } = {}): Promise<AlertaDestinatariosResponse> {
  const params: Record<string, string> = {
    limit: String(filters.limit ?? 200),
  };
  if (filters.search) params.search = filters.search;
  return serverApi.get<AlertaDestinatariosResponse>("/alertas/destinatarios", params);
}

export async function consultarGisHeatmap(tipo: "incidentes" | "alertas" = "alertas"): Promise<GisHeatmapResponse> {
  return serverApi.get<GisHeatmapResponse>("/gis/heatmap", { tipo, limit: "500" });
}

export async function consultarGisProximidad(params: {
  latitud: number;
  longitud: number;
  radio_metros?: number;
}): Promise<GisNearbyResponse> {
  return serverApi.get<GisNearbyResponse>("/gis/proximidad", {
    latitud: String(params.latitud),
    longitud: String(params.longitud),
    radio_metros: String(params.radio_metros ?? 300),
    limit: "50",
  });
}

export async function calcularRuta(origenId: string, destinoId: string): Promise<GisRouteResponse> {
  return serverApi.get<GisRouteResponse>("/gis/rutas", {
    origen_id: origenId,
    destino_id: destinoId,
  });
}
