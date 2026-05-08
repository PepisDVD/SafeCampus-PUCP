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

/** Mensaje asociado al expediente de incidente. */
export interface ComentarioIncidenteItem {
  id: string;
  incidente_id: string;
  autor: UsuarioMini | null;
  contenido: string;
  es_interno: boolean;
  created_at: string;
  updated_at: string;
}

/** Conteo de incidentes por zona (lugar_referencia). */
export interface ZonaCount {
  zona: string;
  total: number;
}

/** Respuesta de GET /api/v1/incidentes/stats. */
export interface DashboardStats {
  total: number;
  activos: number;
  criticos: number;
  en_atencion: number;
  resueltos_24h: number;
  por_zona: ZonaCount[];
}

/** Métrica con valor actual y % de cambio respecto al periodo anterior. */
export interface KpiCard {
  valor: number;
  cambio_pct: number;
  unidad: string;
}

/** Punto de evolución diaria en el chart de timeseries. */
export interface EvolucionPunto {
  fecha: string; // YYYY-MM-DD
  total: number;
  resueltos: number;
  criticos: number;
}

/** Conteo por tipo (categoría) con porcentaje del total. */
export interface TipoCount {
  tipo: string;
  total: number;
  porcentaje: number;
}

/** Indicador SLA con valor actual vs objetivo. */
export interface SlaIndicador {
  actual: number;
  objetivo: number;
  unidad: string;
}

export type KpisPeriod = "semana" | "mes" | "trimestre";

/** Respuesta de GET /api/v1/incidentes/kpis. */
export interface KpisResponse {
  period: KpisPeriod;
  frt: KpiCard;
  tmr: KpiCard;
  total_incidentes: KpiCard;
  tasa_resolucion: KpiCard;
  criticos: KpiCard;
  sla_cumplimiento: KpiCard;
  evolucion: EvolucionPunto[];
  por_tipo: TipoCount[];
  por_zona: ZonaCount[];
  sla: {
    frt: SlaIndicador;
    tmr: SlaIndicador;
    escalamiento: SlaIndicador;
    criticos_sla: SlaIndicador;
  };
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
  comentarios: ComentarioIncidenteItem[];
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
  severidad?: NivelSeveridad | null;
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

/** Body de PATCH /api/v1/incidentes/{id}/estado. */
export interface IncidenteEstadoUpdate {
  estado: EstadoIncidente;
  comentario?: string | null;
}

/** Body de PATCH /api/v1/incidentes/{id}/asignar. */
export interface IncidenteAsignacionUpdate {
  operador_asignado_id: string;
  comentario?: string | null;
}

/** Body de POST /api/v1/incidentes/{id}/comentarios. */
export interface ComentarioIncidenteCreateInput {
  contenido: string;
  es_interno?: boolean;
}

/** Item devuelto por GET /api/v1/incidentes/operadores. */
export interface OperadorListItem {
  id: string;
  nombre_completo: string;
  email: string;
  avatar_url: string | null;
  rol: string;
}
