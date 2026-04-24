import type { EstadoUsuario, RolUsuario } from "@/constants/roles";
import type { UsuarioAdmin } from "@/features/usuarios/types";

export type DomainResult = {
  ok: boolean;
  mensaje?: string;
};

export function contarAdminsActivos(usuarios: UsuarioAdmin[]): number {
  return usuarios.filter((u) => u.rol === "admin" && u.estado === "activo").length;
}

export function puedeCambiarAdminActivo(
  usuarios: UsuarioAdmin[],
  actual: UsuarioAdmin,
  nuevoRol: RolUsuario,
  nuevoEstado: EstadoUsuario,
): DomainResult {
  if (
    actual.rol === "admin" &&
    actual.estado === "activo" &&
    (nuevoRol !== "admin" || nuevoEstado !== "activo") &&
    contarAdminsActivos(usuarios) <= 1
  ) {
    return {
      ok: false,
      mensaje: "Debe existir al menos un administrador activo en el sistema.",
    };
  }

  return { ok: true };
}

export function puedeSuspenderUsuario(
  usuarios: UsuarioAdmin[],
  usuarioObjetivo: UsuarioAdmin,
): DomainResult {
  if (usuarioObjetivo.estado === "suspendido") {
    return { ok: false, mensaje: "El usuario ya se encuentra suspendido." };
  }

  if (
    usuarioObjetivo.rol === "admin" &&
    usuarioObjetivo.estado === "activo" &&
    contarAdminsActivos(usuarios) <= 1
  ) {
    return {
      ok: false,
      mensaje: "No puedes suspender al último administrador activo del sistema.",
    };
  }

  return { ok: true };
}
