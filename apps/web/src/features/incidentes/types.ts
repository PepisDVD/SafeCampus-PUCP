/**
 * 📁 apps/web/src/features/incidentes/types.ts
 * 🎯 Reexporta los tipos del contrato API definidos en shared-types.
 * 📦 Feature: Incidentes
 */

export type {
  Incidente,
  IncidenteCreated,
  IncidenteCreateInput,
  IncidenteListItem,
  IncidenteListResponse,
} from "@safecampus/shared-types";
export { EstadoIncidente, NivelSeveridad, TipoCanal } from "@safecampus/shared-types";