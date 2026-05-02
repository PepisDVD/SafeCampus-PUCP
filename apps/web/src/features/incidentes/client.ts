/**
 * 📁 apps/web/src/features/incidentes/client.ts
 * 🎯 Mutaciones del feature Incidentes para Client Components — habla con el
 *    backend FastAPI vía el cliente HTTP del browser.
 *    NUNCA accede a la base de datos directamente.
 * 📦 Feature: Incidentes (cliente)
 */

import type {
  IncidenteAsignacionUpdate,
  IncidenteDetail,
  IncidenteEstadoUpdate,
} from "@safecampus/shared-types";

import { api } from "@/lib/api/client";

/**
 * PATCH /incidentes/{id}/estado — cambia el estado del incidente.
 * El backend autopobla `fecha_primera_respuesta` y `fecha_resolucion`,
 * y registra la fila en `historial_incidente`.
 */
export async function cambiarEstadoIncidente(
  incidenteId: string,
  body: IncidenteEstadoUpdate,
): Promise<IncidenteDetail> {
  return api.patch<IncidenteDetail>(
    `/incidentes/${encodeURIComponent(incidenteId)}/estado`,
    body,
  );
}

/**
 * PATCH /incidentes/{id}/asignar — asigna operador. El backend marca al
 * supervisor (current user) si todavía no lo está y registra historial.
 */
export async function asignarOperadorIncidente(
  incidenteId: string,
  body: IncidenteAsignacionUpdate,
): Promise<IncidenteDetail> {
  return api.patch<IncidenteDetail>(
    `/incidentes/${encodeURIComponent(incidenteId)}/asignar`,
    body,
  );
}