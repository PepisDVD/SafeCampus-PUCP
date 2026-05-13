/**
 * 📁 apps/web/src/features/incidentes/service.ts
 * 🎯 Cliente del feature de Incidentes — habla con el backend FastAPI.
 *    NUNCA accede a la base de datos directamente.
 * 📦 Feature: Incidentes
 */

import "server-only";

import type {
  DashboardStats,
  IncidenteDetail,
  IncidenteListFilters,
  IncidenteListResponse,
  IncidenteMapaResponse,
  KpisPeriod,
  KpisResponse,
  OperadorListItem,
} from "@safecampus/shared-types";

import { serverApi } from "@/lib/api/server";

/**
 * Lista los incidentes reportados por el usuario autenticado (cookie de sesión).
 * Se ejecuta en Server Components / Server Actions.
 */
export async function listarMisIncidentes(
  limit = 50,
): Promise<IncidenteListResponse> {
  return serverApi.get<IncidenteListResponse>("/incidentes/mis", {
    limit: String(limit),
  });
}

export async function obtenerMiDetalleIncidente(
  incidenteRef: string,
): Promise<IncidenteDetail> {
  return serverApi.get<IncidenteDetail>(
    `/incidentes/mis/${encodeURIComponent(incidenteRef)}`,
  );
}

/**
 * Lista operativa de incidentes para roles supervisor / operador / administrador.
 * Soporta filtros por búsqueda libre, severidad y estado.
 */
export async function listarIncidentes(
  filters: IncidenteListFilters = {},
): Promise<IncidenteListResponse> {
  const params: Record<string, string> = {
    limit: String(filters.limit ?? 50),
  };
  if (filters.search) params.search = filters.search;
  if (filters.severidad) params.severidad = filters.severidad;
  if (filters.estado) params.estado = filters.estado;

  return serverApi.get<IncidenteListResponse>("/incidentes/", params);
}

export async function listarIncidentesMapa(
  filters: IncidenteListFilters & { activos_only?: boolean } = {},
): Promise<IncidenteMapaResponse> {
  const params: Record<string, string> = {
    limit: String(filters.limit ?? 300),
    activos_only: String(filters.activos_only ?? true),
  };
  if (filters.severidad) params.severidad = filters.severidad;
  if (filters.estado) params.estado = filters.estado;

  return serverApi.get<IncidenteMapaResponse>("/incidentes/mapa", params);
}

/**
 * Detalle completo de un incidente — incluye reportante, asignación e historial.
 * Restringido a roles operativos por el backend.
 */
export async function obtenerDetalleIncidente(
  incidenteId: string,
): Promise<IncidenteDetail> {
  return serverApi.get<IncidenteDetail>(
    `/incidentes/${encodeURIComponent(incidenteId)}`,
  );
}

/**
 * Métricas agregadas + top zonas para el dashboard operativo.
 * Restringido a roles operativos por el backend.
 */
export async function obtenerStats(): Promise<DashboardStats> {
  return serverApi.get<DashboardStats>("/incidentes/stats");
}

/**
 * KPIs operativos del periodo + comparación vs periodo anterior + breakdowns
 * por tipo y zona + indicadores SLA.
 * Restringido a roles operativos por el backend.
 */
export async function obtenerKpis(
  period: KpisPeriod = "mes",
): Promise<KpisResponse> {
  return serverApi.get<KpisResponse>("/incidentes/kpis", { period });
}

/**
 * Lista de operadores y supervisores disponibles para asignar a un incidente.
 * Usado por el panel de acciones del detalle (prefetch desde el server).
 */
export async function listarOperadores(): Promise<OperadorListItem[]> {
  return serverApi.get<OperadorListItem[]>("/incidentes/operadores");
}
