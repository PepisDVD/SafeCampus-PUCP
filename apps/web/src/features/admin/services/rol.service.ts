import { serverApi } from "@/lib/api/server";

export type Permiso = {
  id: string;
  modulo: string;
  accion: string;
  descripcion: string | null;
};

export type RolConPermisos = {
  id: string;
  nombre: string;
  descripcion: string | null;
  es_sistema: boolean;
  permisos: Permiso[];
};

export async function listarRoles(): Promise<RolConPermisos[]> {
  const res = await serverApi.get<{ items: RolConPermisos[] }>("/admin/roles");
  return res.items;
}

export async function listarPermisos(): Promise<Permiso[]> {
  const res = await serverApi.get<{ items: Permiso[] }>("/admin/roles/permisos");
  return res.items;
}
