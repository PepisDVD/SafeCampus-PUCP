"use server";

import { revalidatePath } from "next/cache";
import { serverApi } from "@/lib/api/server";

export async function actualizarPermisosRol(
  rolId: string,
  permisoIds: string[],
): Promise<{ error?: string }> {
  try {
    await serverApi.put(`/admin/roles/${rolId}/permisos`, { permiso_ids: permisoIds });
    revalidatePath("/roles");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudieron actualizar los permisos." };
  }
}

export async function verificarIntegracion(
  integrationId: string,
): Promise<{ error?: string }> {
  try {
    await serverApi.post(`/admin/integraciones/${integrationId}/verificar`);
    revalidatePath("/integraciones");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo verificar la integración." };
  }
}
