import { listarIntegraciones } from "@/features/admin/services/integracion.service";
import { IntegracionesClient } from "@/features/admin/components/integraciones/integraciones-client";

export default async function IntegracionesPage() {
  const integraciones = await listarIntegraciones();

  return <IntegracionesClient initialIntegraciones={integraciones} />;
}
