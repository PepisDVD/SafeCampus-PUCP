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
): Promise<{ error?: string }> {
  if (!isValidInstitutionalEmail(input.email)) {
    return { error: EMAIL_DOMAIN_ERROR };
  }
  try {
    await serverApi.post("/admin/usuarios", {
      nombre: input.nombre.trim(),
      apellido: input.apellido.trim(),
      email: input.email.trim().toLowerCase(),
      codigo_institucional: input.codigo_institucional.trim() || null,
      departamento: input.departamento.trim() || null,
      rol_id: input.rolId,
    });
    revalidatePath("/usuarios");
    return {};
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
