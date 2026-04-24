/**
 * 📁 apps/web/src/app/(admin)/auditoria/page.tsx
 * 🎯 Log de auditoría transversal (UC-GU-07).
 *    Cada acción realizada en los otros tabs escribe eventos aquí.
 * 📦 Módulo: Admin / Auditoría
 */

import { AuditoriaPanel } from "@/features/auditoria";

import { AdminPageHeader } from "../_components/admin-page-header";

export default function AuditoriaPage() {
  return (
    <section>
      <AdminPageHeader
        title="Log de Auditoría"
        description="Registro centralizado de acciones administrativas y alertas del sistema."
      />
      <AuditoriaPanel />
    </section>
  );
}
