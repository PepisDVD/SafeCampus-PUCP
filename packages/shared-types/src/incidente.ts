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
  operador_avatar_url: string | null;
  created_at: string;
}

/** Filtros aceptados por GET /api/v1/incidentes (vista operativa). */
export interface IncidenteListFilters {
  search?: string;
  severidad?: NivelSeveridad;
  estado?: EstadoIncidente;
  limit?: number;
}

/** Representación reducida de usuario en respuestas de incidente. */
export interface UsuarioMini {
  id: string;
  nombre_completo: string;
  email: string | null;
  avatar_url: string | null;
}

/** Evento del historial de un incidente. */
export interface HistorialEvento {
  id: string;
  estado_anterior: EstadoIncidente | null;
  estado_nuevo: EstadoIncidente;
  accion: string;
  comentario: string | null;
  ejecutado_por: UsuarioMini | null;
  created_at: string;
}

/** Respuesta de GET /api/v1/incidentes/{id}. */
export interface IncidenteDetail {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  estado: EstadoIncidente;
  severidad: NivelSeveridad | null;
  categoria: string | null;
  lugar_referencia: string | null;
  canal_origen: TipoCanal;
  fecha_primera_respuesta: string | null;
  fecha_resolucion: string | null;
  created_at: string;
  updated_at: string;
  reportante: UsuarioMini | null;
  operador_asignado: UsuarioMini | null;
  supervisor: UsuarioMini | null;
  historial: HistorialEvento[];
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
