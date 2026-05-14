/**
 * 📁 apps/web/src/features/incidentes/client.ts
 * 🎯 Mutaciones del feature Incidentes para Client Components — habla con el
 *    backend FastAPI vía el cliente HTTP del browser.
 *    NUNCA accede a la base de datos directamente.
 * 📦 Feature: Incidentes (cliente)
 */

import type {
  IncidenteAsignacionUpdate,
  ComentarioIncidenteCreateInput,
  ComentarioIncidenteItem,
  EvidenciaIncidenteItem,
  ExpedienteCierreAiDraft,
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

export async function crearComentarioIncidente(
  incidenteId: string,
  body: ComentarioIncidenteCreateInput,
): Promise<ComentarioIncidenteItem> {
  return api.post<ComentarioIncidenteItem>(
    `/incidentes/${encodeURIComponent(incidenteId)}/comentarios`,
    body,
  );
}

export async function generarBorradorCierreIa(
  incidenteId: string,
): Promise<ExpedienteCierreAiDraft> {
  return api.post<ExpedienteCierreAiDraft>(
    `/incidentes/${encodeURIComponent(incidenteId)}/expediente-cierre/borrador-ia`,
    {},
  );
}

/**
 * POST /incidentes/{id}/evidencias — adjunta una imagen de evidencia.
 * Usa multipart/form-data; el backend sube el archivo a Supabase Storage.
 */
export async function subirEvidencia(
  incidenteId: string,
  archivo: File,
  descripcion?: string,
): Promise<EvidenciaIncidenteItem> {
  const form = new FormData();
  form.append("archivo", archivo);
  if (descripcion) form.append("descripcion", descripcion);
  return api.postMultipart<EvidenciaIncidenteItem>(
    `/incidentes/${encodeURIComponent(incidenteId)}/evidencias`,
    form,
  );
}
