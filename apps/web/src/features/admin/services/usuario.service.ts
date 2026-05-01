import { serverApi } from "@/lib/api/server";

export type EstadoUsuario = "ACTIVO" | "INACTIVO" | "SUSPENDIDO";

export type RolBrief = { id: string; nombre: string };

export type UsuarioConRoles = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  codigo_institucional: string | null;
  departamento: string | null;
  estado: EstadoUsuario;
  avatar_url: string | null;
  ultimo_acceso: string | null;
  created_at: string;
  roles: RolBrief[];
};

export type UsuariosResponse = {
  items: UsuarioConRoles[];
  total: number;
  activos: number;
  inactivos: number;
  suspendidos: number;
};

export async function listarUsuarios(filters?: {
  search?: string;
  estado?: string;
}): Promise<UsuariosResponse> {
  const params: Record<string, string> = {};
  if (filters?.search) params.search = filters.search;
  if (filters?.estado && filters.estado !== "todos") params.estado = filters.estado;
  return serverApi.get<UsuariosResponse>("/admin/usuarios", params);
}
