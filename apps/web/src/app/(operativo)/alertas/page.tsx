import { AlertasClient } from "@/features/alertas/components/alertas-client";
import { listarAlertas } from "@/features/alertas/service";
import { listarUbicacionesMaestras } from "@/features/admin/services/maestros.service";

export default async function AlertasPage() {
  const [data, ubicaciones] = await Promise.all([
    listarAlertas({ limit: 100 }).catch(() => ({ items: [], total: 0 })),
    listarUbicacionesMaestras(false).catch(() => []),
  ]);

  return <AlertasClient initialData={data} ubicaciones={ubicaciones} />;
}
