/**
 * 📁 apps/web/src/app/(admin)/integraciones/page.tsx
 * 🎯 Monitoreo de integraciones externas (UC-GU-06).
 *    Permite verificar manualmente: OpenAI · WhatsApp · Maps · Gmail · Google SSO.
 * 📦 Módulo: Admin / Integraciones
 */

import { IntegracionesPanel } from "@/features/integraciones";

import { AdminPageHeader } from "../_components/admin-page-header";

export default function IntegracionesPage() {
  return (
    <section>
      <AdminPageHeader
        title="Integraciones Externas"
        description="Monitoreo y verificación de los servicios de terceros conectados a SafeCampus."
      />
      <IntegracionesPanel />
    </section>
  );
}
