/**
 * 📁 packages/shared-types/src/incidente.ts
 * 🎯 Interfaces TypeScript del expediente único de incidente y contratos del API.
 * 📦 Capa: Packages / Shared Types
 *
 * Estas interfaces son el contrato compartido entre backend (FastAPI/Pydantic)
 * y frontends (web + mobile). Mantener en sync con app/schemas/incidente.py.
 */

import { EstadoIncidente, NivelSeveridad, TipoCanal } from "./enums";

export interface Incidente {
  id: string;
  codigo: string; // INC-YYYYMMDD-XXXXX
  titulo: string;
  descripcion: string;
  estado: EstadoIncidente;
  severidad: NivelSeveridad;
  categoria: string | null;
  canal_origen: TipoCanal;
  latitud: number | null;
  longitud: number | null;
  reportante_id: string;
  operador_asignado_id: string | null;
  supervisor_id: string | null;
  created_at: string;
  updated_at: string;
}

// --- API contracts ---------------------------------------------------------

/** Item devuelto por GET /api/v1/incidentes y GET /api/v1/incidentes/mis. */
export interface IncidenteListItem {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string | null;
  estado: EstadoIncidente;
  severidad: NivelSeveridad | null;
  categoria: string | null;
  lugar_referencia: string | null;
  canal_origen: TipoCanal;
  operador_nombre: string | null;
  created_at: string;
}

/** Wrapper de respuesta para listados. */
export interface IncidenteListResponse {
  items: IncidenteListItem[];
  total: number;
}

/** Body de POST /api/v1/incidentes (creación desde el PWA Comunidad). */
export interface IncidenteCreateInput {
  titulo: string;
  descripcion: string;
  categoria?: string | null;
  lugar_referencia?: string | null;
  latitud?: number | null;
  longitud?: number | null;
}

/** Respuesta de POST /api/v1/incidentes. */
export interface IncidenteCreated {
  id: string;
  codigo: string;
  estado: EstadoIncidente;
  created_at: string;
}
