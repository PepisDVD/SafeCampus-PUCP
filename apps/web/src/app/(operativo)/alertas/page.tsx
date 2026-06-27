import { AlertasClient } from "@/features/alertas/components/alertas-client";
import { listarAlertas, listarDestinatarios } from "@/features/alertas/service";
import { listarUbicacionesMaestras } from "@/features/admin/services/maestros.service";

export default async function AlertasPage() {
  const [data, ubicaciones, destinatarios] = await Promise.all([
    listarAlertas({ limit: 100 }).catch(() => ({ items: [], total: 0 })),
    listarUbicacionesMaestras(false).catch(() => []),
    listarDestinatarios({ limit: 200 }).catch(() => ({ items: [], total: 0 })),
  ]);

  return <AlertasClient initialData={data} ubicaciones={ubicaciones} usuarios={destinatarios.items} />;
}
