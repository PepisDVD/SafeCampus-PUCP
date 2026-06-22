"use server";

import { revalidatePath } from "next/cache";
import { serverApi } from "@/lib/api/server";
import { EMAIL_DOMAIN_ERROR, isValidInstitutionalEmail } from "@/lib/email";

export type CreateUsuarioInput = {
  nombre: string;
  apellido: string;
  email: string;
  codigo_institucional: string;
  departamento: string;
  rolId: string;
  /** Contraseña manual (solo cuentas no institucionales). */
  password?: string | null;
  /** Solicita una contraseña autogenerada (solo cuentas no institucionales). */
  generarPassword?: boolean;
};

export type UpdateUsuarioProfileInput = {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  departamento: string;
};

export async function crearUsuario(
  input: CreateUsuarioInput,
): Promise<{ error?: string; passwordGenerada?: string }> {
  if (!isValidInstitutionalEmail(input.email)) {
    return { error: EMAIL_DOMAIN_ERROR };
  }
  try {
    const created = await serverApi.post<{ password_generada?: string | null }>(
      "/admin/usuarios",
      {
        nombre: input.nombre.trim(),
        apellido: input.apellido.trim(),
        email: input.email.trim().toLowerCase(),
        codigo_institucional: input.codigo_institucional.trim() || null,
        departamento: input.departamento.trim() || null,
        rol_id: input.rolId,
        password: input.password?.trim() || null,
        generar_password: Boolean(input.generarPassword),
      },
    );
    revalidatePath("/usuarios");
    return { passwordGenerada: created?.password_generada ?? undefined };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo crear el usuario." };
  }
}

export async function cambiarEstadoUsuario(
  id: string,
  estado: string,
): Promise<{ error?: string }> {
  try {
    await serverApi.patch(`/admin/usuarios/${id}/estado`, { estado });
    revalidatePath("/usuarios");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo cambiar el estado." };
  }
}

export async function actualizarPerfilUsuario(
  input: UpdateUsuarioProfileInput,
): Promise<{ error?: string }> {
  try {
    await serverApi.patch(`/admin/usuarios/${input.id}/perfil`, {
      nombre: input.nombre.trim(),
      apellido: input.apellido.trim(),
      telefono: input.telefono.trim() || null,
      departamento: input.departamento.trim() || null,
    });
    revalidatePath("/usuarios");
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No se pudo actualizar el perfil.",
    };
  }
}
