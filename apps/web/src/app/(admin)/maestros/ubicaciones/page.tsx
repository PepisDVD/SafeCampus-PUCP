import { UbicacionesClient } from "@/features/admin/components/maestros/ubicaciones-client";
import { listarUbicacionesMaestras } from "@/features/admin/services/maestros.service";

export default async function UbicacionesMaestrasPage() {
  const ubicaciones = await listarUbicacionesMaestras(true);
  return <UbicacionesClient initialItems={ubicaciones} />;
}
