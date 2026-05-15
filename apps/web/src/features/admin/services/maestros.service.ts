import type { UbicacionMaestra } from "@safecampus/shared-types";
import { serverApi } from "@/lib/api/server";

export async function listarUbicacionesMaestras(includeInactive = true): Promise<UbicacionMaestra[]> {
  return serverApi.get<UbicacionMaestra[]>("/maestros/ubicaciones", {
    include_inactive: includeInactive ? "true" : "false",
  });
}
