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
