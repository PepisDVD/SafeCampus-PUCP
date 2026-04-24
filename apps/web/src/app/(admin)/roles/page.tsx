/**
 * 📁 apps/web/src/app/(admin)/roles/page.tsx
 * 🎯 Administración de roles y matriz RBAC v1.0 (UC-GU-05).
 * 📦 Módulo: Admin / Roles
 */

import { RbacMatrix } from "@/features/roles";

import { AdminPageHeader } from "../_components/admin-page-header";

export default function RolesPage() {
  return (
    <section>
      <AdminPageHeader
        title="Roles y Permisos"
        description="Matriz RBAC v1.0 de SafeCampus — comunidad, operador, supervisor y administrador."
      />
      <RbacMatrix />
    </section>
  );
}
