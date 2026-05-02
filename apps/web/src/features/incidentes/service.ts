/**
 * 📁 apps/web/src/features/incidentes/service.ts
 * 🎯 Cliente del feature de Incidentes — habla con el backend FastAPI.
 *    NUNCA accede a la base de datos directamente.
 * 📦 Feature: Incidentes
 */

import "server-only";

import type {
  IncidenteDetail,
  IncidenteListFilters,
  IncidenteListResponse,
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