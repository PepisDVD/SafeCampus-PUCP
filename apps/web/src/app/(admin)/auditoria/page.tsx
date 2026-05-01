import {
  listarAuditoria,
  obtenerModulosDistintos,
} from "@/features/admin/services/auditoria.service";
import { AuditoriaClient } from "@/features/admin/components/auditoria/auditoria-client";

export default async function AuditoriaPage() {
  const [logs, modulos] = await Promise.all([
    listarAuditoria({}, 100),
    obtenerModulosDistintos(),
  ]);

  return <AuditoriaClient initialLogs={logs} modulos={modulos} />;
}
