import { redirect } from "next/navigation";

import { AdminShell } from "@/app/(admin)/_components/admin-shell";
import { ComunidadShell } from "@/app/(comunidad)/_components/comunidad-shell";
import { OperativoShell } from "@/app/(operativo)/_components/operativo-shell";
import { ProfilePageClient } from "@/features/profile/components/profile-page-client";
import { getCurrentUserProfile } from "@/lib/auth/server";

export default async function PerfilPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login?next=/perfil");
  }

  const content = (
    <ProfilePageClient
      profile={{
        id: profile.id,
        nombre: profile.nombre,
        apellido: profile.apellido,
        email: profile.navUser.email,
        codigoInstitucional: profile.codigoInstitucional,
        telefono: profile.telefono,
        departamento: profile.departamento,
        roles: profile.roles,
      }}
    />
  );

  if (profile.roles.includes("administrador")) {
    return <AdminShell user={profile.navUser}>{content}</AdminShell>;
  }

  if (
    profile.roles.includes("supervisor") ||
    profile.roles.includes("operador")
  ) {
    return <OperativoShell user={profile.navUser}>{content}</OperativoShell>;
  }

  return <ComunidadShell>{content}</ComunidadShell>;
}
