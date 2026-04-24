/**
 * 📁 apps/web/src/app/(admin)/usuarios/page.tsx
 * 🎯 Gestión de usuarios del sistema (UC-GU-02/03/04):
 *    listar, crear, editar, suspender y reactivar cuentas.
 * 📦 Módulo: Admin / Usuarios
 */

import { UsuariosPanel } from "@/features/usuarios";

import { AdminPageHeader } from "../_components/admin-page-header";

export default function UsuariosPage() {
  return (
    <section>
      <AdminPageHeader
        title="Gestión de Usuarios"
        description="Administración de cuentas, roles y estados de los usuarios del sistema."
      />
      <UsuariosPanel />
    </section>
  );
}
