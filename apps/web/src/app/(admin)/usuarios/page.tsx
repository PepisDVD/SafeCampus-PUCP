import { listarUsuarios } from "@/features/admin/services/usuario.service";
import { listarRoles } from "@/features/admin/services/rol.service";
import { UsuariosClient } from "@/features/admin/components/usuarios/usuarios-client";

export default async function UsuariosPage() {
  const [usuariosRes, roles] = await Promise.all([
    listarUsuarios(),
    listarRoles(),
  ]);

  const stats = {
    total: usuariosRes.total,
    activos: usuariosRes.activos,
    inactivos: usuariosRes.inactivos,
    suspendidos: usuariosRes.suspendidos,
  };

  return (
    <UsuariosClient
      initialUsuarios={usuariosRes.items}
      roles={roles}
      stats={stats}
    />
  );
}
