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
}

export interface AuditoriaListResponse {
  items: RegistroAuditoria[];
  total: number;
}

export interface AuditoriaModulosResponse {
  modulos: string[];
}
