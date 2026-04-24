import { api } from "./client";

export type TipoCanal = "WEB" | "MOVIL" | "MENSAJERIA";
export type EstadoIncidente =
  | "RECIBIDO"
  | "EN_EVALUACION"
  | "EN_ATENCION"
  | "ESCALADO"
  | "PENDIENTE_INFO"
  | "RESUELTO"
  | "CERRADO";
export type NivelSeveridad = "BAJO" | "MEDIO" | "ALTO" | "CRITICO";

export type EvidenciaCreatePayload = {
  tipo_archivo: string;
  nombre_archivo: string;
  url_archivo: string;
  tamano_bytes?: number | null;
  mime_type?: string | null;
  descripcion?: string | null;
};

export type CreateIncidentePayload = {
  descripcion: string;
  canal_origen: TipoCanal;
  ubicacion_texto?: string | null;
  coordenadas?: {
    latitude: number;
    longitude: number;
    precision_metros?: number | null;
    altitud?: number | null;
  } | null;
  evidencias?: EvidenciaCreatePayload[];
  metadata_canal?: Record<string, unknown>;
  correlation_id?: string | null;
  categoria?: string | null;
  severidad?: NivelSeveridad | null;
};

export type IncidenteListItemApi = {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  estado: EstadoIncidente;
  severidad: NivelSeveridad | null;
  categoria: string | null;
  zona: string | null;
  canal_origen: TipoCanal;
  reportante_nombre: string;
  operador_nombre: string | null;
  fecha_registro: string;
};

export type IncidentesListResponse = {
  items: IncidenteListItemApi[];
  total: number;
};

export type IncidenteCreateResponse = {
  success: boolean;
  message: string;
  incident: {
    id: string;
    codigo: string;
    estado: EstadoIncidente;
    canal_origen: TipoCanal;
    fecha_registro: string;
  };
  reporte_entrante_id: string;
  es_correlacionado: boolean;
};

export type IncidenteDetailResponse = IncidenteListItemApi & {
  lugar_referencia: string | null;
  reportante_id: string;
  operador_asignado_id: string | null;
  supervisor_id: string | null;
  es_anonimo: boolean;
  updated_at: string;
  historial: Array<{
    id: string;
    estado_anterior: EstadoIncidente | null;
    estado_nuevo: EstadoIncidente;
    accion: string;
    comentario: string | null;
    ejecutado_por_nombre: string | null;
    created_at: string;
  }>;
  evidencias: Array<{
    id: string;
    tipo_archivo: string;
    nombre_archivo: string;
    url_archivo: string;
    mime_type: string | null;
    descripcion: string | null;
    created_at: string;
  }>;
  ubicaciones: Array<{
    id: string;
    descripcion: string | null;
    fuente: string | null;
    latitud: number | null;
    longitud: number | null;
    precision_metros: number | null;
    created_at: string;
  }>;
};

export const incidentesApi = {
  list(params: {
    limit?: number;
    search?: string;
    estado?: EstadoIncidente | "TODOS";
    canal_origen?: TipoCanal | "TODOS";
    mine?: boolean;
  } = {}) {
    const query: Record<string, string> = {};
    if (params.limit) query.limit = String(params.limit);
    if (params.search) query.search = params.search;
    if (params.estado && params.estado !== "TODOS") query.estado = params.estado;
    if (params.canal_origen && params.canal_origen !== "TODOS") {
      query.canal_origen = params.canal_origen;
    }
    if (params.mine) query.mine = "true";
    return api.get<IncidentesListResponse>("/incidentes", { params: query });
  },
  create(payload: CreateIncidentePayload) {
    return api.post<IncidenteCreateResponse>("/incidentes", payload);
  },
  get(id: string) {
    return api.get<IncidenteDetailResponse>(`/incidentes/${id}`);
  },
};
