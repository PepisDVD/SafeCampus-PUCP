import { serverApi } from "@/lib/api/server";

export type RegistroAuditoria = {
  id: string;
  fecha_registro: string;
  usuario_id: string | null;
  modulo: string;
  accion: string;
  entidad: string | null;
  entidad_id: string | null;
  detalle: Record<string, unknown> | null;
};

export type AuditoriaFilters = {
  search?: string;
  modulo?: string;
  usuario_id?: string;
  desde?: string;
  hasta?: string;
};

export async function listarAuditoria(
  filters: AuditoriaFilters = {},
  limit = 100,
): Promise<RegistroAuditoria[]> {
  const params: Record<string, string> = { limit: String(limit) };
  if (filters.search) params.search = filters.search;
  if (filters.modulo) params.modulo = filters.modulo;
  if (filters.usuario_id) params.usuario_id = filters.usuario_id;
  if (filters.desde) params.desde = filters.desde;
  if (filters.hasta) params.hasta = filters.hasta;

  const res = await serverApi.get<{ items: RegistroAuditoria[]; total: number }>(
    "/admin/auditoria",
    params,
  );
  return res.items;
}

export async function obtenerModulosDistintos(): Promise<string[]> {
  const res = await serverApi.get<{ modulos: string[] }>(
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
