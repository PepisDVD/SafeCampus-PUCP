/**
 * API contracts for centralized audit logs.
 */

export interface AuditoriaUsuario {
  id: string;
  nombre_completo: string;
  email: string | null;
  avatar_url: string | null;
}

export interface RegistroAuditoria {
  id: string;
  fecha_registro: string;
  usuario_id: string | null;
  usuario: AuditoriaUsuario | null;
  modulo: string;
  accion: string;
  entidad: string | null;
  entidad_id: string | null;
  detalle: Record<string, unknown> | null;
  ip_origen: string | null;
  dispositivo: string | null;
  /** Derived from `detalle.origen` (e.g. WEB, APP_MOVIL) when present. */
  origen: string | null;
  /** Derived from `detalle.resultado` (exitoso | fallido | denegado) when present. */
  resultado: string | null;
}

/**
 * Keyset-paginated response. No total count is returned; use `has_more` +
 * `next_cursor` to page forward.
 */
export interface AuditoriaListResponse {
  items: RegistroAuditoria[];
  page_size: number;
  has_more: boolean;
  next_cursor: string | null;
}

export interface AuditoriaModulosResponse {
  modulos: string[];
}

export interface AuditoriaAccionesResponse {
  acciones: string[];
}

export interface AuditoriaUsuarioRef {
  id: string;
  nombre_completo: string;
  email: string | null;
}

export interface AuditoriaUsuariosResponse {
  usuarios: AuditoriaUsuarioRef[];
}
