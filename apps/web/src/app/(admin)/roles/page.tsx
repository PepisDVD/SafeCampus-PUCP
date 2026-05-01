import { listarRoles, listarPermisos } from "@/features/admin/services/rol.service";
import { RbacMatrixClient } from "@/features/admin/components/roles/rbac-matrix-client";

export default async function RolesPage() {
  const [roles, permisos] = await Promise.all([
    listarRoles(),
    listarPermisos(),
  ]);

  return <RbacMatrixClient roles={roles} permisos={permisos} />;
}
