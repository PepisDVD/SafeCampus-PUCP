/**
 * 📁 apps/web/src/features/incidentes/service.ts
 * 🎯 Cliente del feature de Incidentes — habla con el backend FastAPI.
 *    NUNCA accede a la base de datos directamente.
 * 📦 Feature: Incidentes
 */

import "server-only";

import type {
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