import type {
  AuditoriaAccionesResponse,
  AuditoriaListResponse,
  AuditoriaModulosResponse,
  AuditoriaUsuarioRef,
  AuditoriaUsuariosResponse,
  RegistroAuditoria,
} from "@safecampus/shared-types";

import { serverApi } from "@/lib/api/server";

export type AuditoriaFilters = {
  search?: string;
  /** CSV-friendly: passed through as comma-separated values to the backend. */
  modulo?: string;
  accion?: string;
  usuario_id?: string;
  entidad?: string;
  resultado?: string;
  desde?: string;
  hasta?: string;
  cursor?: string;
  page_size?: number;
};

export type { RegistroAuditoria, AuditoriaListResponse, AuditoriaUsuarioRef };

export async function listarAuditoria(
  filters: AuditoriaFilters = {},
): Promise<AuditoriaListResponse> {
  const params: Record<string, string> = {
    page_size: String(filters.page_size ?? 25),
  };
  if (filters.search) params.search = filters.search;
  if (filters.modulo) params.modulo = filters.modulo;
  if (filters.accion) params.accion = filters.accion;
  if (filters.usuario_id) params.usuario_id = filters.usuario_id;
  if (filters.entidad) params.entidad = filters.entidad;
  if (filters.resultado) params.resultado = filters.resultado;
  if (filters.desde) params.desde = filters.desde;
  if (filters.hasta) params.hasta = filters.hasta;
  if (filters.cursor) params.cursor = filters.cursor;

  return serverApi.get<AuditoriaListResponse>("/admin/auditoria", params);
}

export async function obtenerModulosDistintos(): Promise<string[]> {
  const res = await serverApi.get<AuditoriaModulosResponse>(
    "/admin/auditoria/modulos",
    undefined,
    {
      cache: "force-cache",
      revalidate: 120,
      tags: ["admin-catalogs", "admin-auditoria-modulos"],
    },
  );
  return res.modulos;
}

export async function obtenerAccionesDistintas(): Promise<string[]> {
  const res = await serverApi.get<AuditoriaAccionesResponse>(
    "/admin/auditoria/acciones",
    undefined,
    {
      cache: "force-cache",
      revalidate: 120,
      tags: ["admin-catalogs", "admin-auditoria-acciones"],
    },
  );
  return res.acciones;
}

export async function obtenerUsuariosAuditoria(): Promise<AuditoriaUsuarioRef[]> {
  const res = await serverApi.get<AuditoriaUsuariosResponse>(
    "/admin/auditoria/usuarios",
    undefined,
    {
      cache: "force-cache",
      revalidate: 120,
      tags: ["admin-catalogs", "admin-auditoria-usuarios"],
    },
  );
  return res.usuarios;
}
