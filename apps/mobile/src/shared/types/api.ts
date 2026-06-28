export type OperatorRole = "operador" | "supervisor" | "administrador";

export type AuthUser = {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  avatar_url?: string | null;
  codigo_institucional?: string | null;
  telefono?: string | null;
  departamento?: string | null;
  roles: string[];
};

export type AuthSession = {
  access_token: string;
  token_type: "bearer";
  user: AuthUser;
};

export type IncidentStatus =
  | "RECIBIDO"
  | "EN_EVALUACION"
  | "EN_ATENCION"
  | "ESCALADO"
  | "PENDIENTE_INFO"
  | "RESUELTO"
  | "CERRADO";

export type IncidentSeverity = "BAJO" | "MEDIO" | "ALTO" | "CRITICO";

export type IncidentListItem = {
  id: string;
  codigo: string;
  titulo: string;
  descripcion?: string | null;
  estado: IncidentStatus;
  severidad?: IncidentSeverity | null;
  categoria?: string | null;
  lugar_referencia?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  live_location_enabled?: boolean;
  live_location_updated_at?: string | null;
  live_location_expires_at?: string | null;
  canal_origen: "WEB" | "MOVIL" | "MENSAJERIA";
  operador_nombre?: string | null;
  operador_avatar_url?: string | null;
  created_at?: string | null;
};

export type IncidentListResponse = {
  items: IncidentListItem[];
  total: number;
};

export type DashboardStats = {
  total: number;
  activos: number;
  criticos: number;
  en_atencion: number;
  resueltos_24h: number;
  por_zona: Array<{ zona: string; total: number }>;
};

export type IncidentDetail = IncidentListItem & {
  updated_at: string;
  reportante?: { id: string; nombre_completo: string; email?: string | null } | null;
  operador_asignado?: { id: string; nombre_completo: string; email?: string | null } | null;
  historial: Array<{
    id: string;
    accion: string;
    comentario?: string | null;
    estado_anterior?: IncidentStatus | null;
    estado_nuevo: IncidentStatus;
    created_at: string;
  }>;
  comentarios: Array<{
    id: string;
    autor?: { id: string; nombre_completo: string; email?: string | null } | null;
    contenido: string;
    es_interno: boolean;
    created_at: string;
  }>;
};

export type LostFoundCaseType = "PERDIDO" | "ENCONTRADO";
export type LostFoundCaseStatus =
  | "ABIERTO"
  | "EN_REVISION"
  | "CONFIRMADO"
  | "EN_CUSTODIA"
  | "DEVUELTO"
  | "DESCARTADO"
  | "CERRADO";
export type LostFoundCustodyStatus =
  | "ACTIVA"
  | "PROXIMA_VENCER"
  | "VENCIDA"
  | "DEVUELTA"
  | "DESCARTADA";

export type LostFoundCategory = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  es_perecible: boolean;
  metadatos_schema?: { campos?: Array<{ codigo: string; etiqueta: string; tipo: string; requerido?: boolean; activo?: boolean }> } | null;
};

export type LostFoundCase = {
  id: string;
  codigo: string;
  tipo: LostFoundCaseType;
  estado: LostFoundCaseStatus;
  titulo: string;
  descripcion: string;
  categoria_id?: string | null;
  categoria_nombre?: string | null;
  lugar_referencia?: string | null;
  fecha_evento?: string | null;
  foto_url?: string | null;
  foto_adicional_urls?: string[];
  color_principal?: string | null;
  marca?: string | null;
  origen: "COMUNIDAD" | "OPERADOR_MOVIL";
  comentarios_habilitados: boolean;
  created_at: string;
};

export type LostFoundCaseListResponse = {
  items: LostFoundCase[];
  total: number;
  next_cursor?: string | null;
};

export type LostFoundCustody = {
  id: string;
  caso_id: string;
  codigo?: string | null;
  titulo?: string | null;
  categoria_nombre?: string | null;
  foto_url?: string | null;
  foto_adicional_urls?: string[];
  estado: LostFoundCustodyStatus;
  ubicacion_custodia: string;
  observaciones?: string | null;
  es_perecible: boolean;
  fecha_recepcion: string;
  fecha_vencimiento: string;
  created_at: string;
  updated_at: string;
};

export type LostFoundCustodyListResponse = {
  items: LostFoundCustody[];
  total: number;
  page: number;
  per_page: number;
};

export type LostFoundReceptionPayload = {
  tipo: "ENCONTRADO";
  titulo: string;
  descripcion: string;
  categoria_id: string;
  lugar_referencia: string;
  fecha_evento: string;
  etiquetas?: string[];
  metadatos?: Record<string, string | number>;
  contacto_info?: string | null;
  ubicacion_custodia: string;
  observaciones_custodia?: string | null;
  es_perecible?: boolean | null;
};

export type LostFoundReceptionResult = {
  caso: {
    id: string;
    codigo: string;
    estado: LostFoundCaseStatus;
    created_at: string;
    matches_generados: number;
  };
  custodia: LostFoundCustody;
};
