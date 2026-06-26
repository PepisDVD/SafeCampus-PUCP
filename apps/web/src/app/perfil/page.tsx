/**
 * 📁 apps/web/src/app/perfil/page.tsx
 * 🎯 Página de perfil — render condicional según rol.
 *    - Comunidad → vista mobile (resumen, info personal, notificaciones, preferencias).
 *    - Operativo / Admin → form de edición desktop (compartido).
 * 📦 Capa: App Router
 */

import { redirect } from "next/navigation";
import { EstadoIncidente } from "@safecampus/shared-types";

import { AdminShell } from "@/app/(admin)/_components/admin-shell";
import { ComunidadShell } from "@/app/(comunidad)/_components/comunidad-shell";
import { OperativoShell } from "@/app/(operativo)/_components/operativo-shell";
import { ComunidadProfile } from "@/features/profile/components/comunidad-profile";
import { ProfilePageClient } from "@/features/profile/components/profile-page-client";
import { listarMisIncidentes } from "@/features/incidentes/service";
import { getLostFoundAccess } from "@/features/lost-found/service";
import { getCurrentUserProfile } from "@/lib/auth/server";

const ESTADOS_RESUELTOS: ReadonlySet<EstadoIncidente> = new Set([
  EstadoIncidente.RESUELTO,
  EstadoIncidente.CERRADO,
]);

export default async function PerfilPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login?next=/perfil");
  }

  const esComunidad =
    !profile.roles.includes("administrador") &&
    !profile.roles.includes("supervisor") &&
    !profile.roles.includes("operador");

  if (esComunidad) {
    const reportes = await listarMisIncidentes(100).catch(() => ({
      items: [],
      total: 0,
    }));
    const resueltos = reportes.items.filter((r) =>
      ESTADOS_RESUELTOS.has(r.estado),
    ).length;
    const stats = {
      total: reportes.total,
      activos: reportes.total - resueltos,
      resueltos,
    };

    return (
      <ComunidadShell>
        <ComunidadProfile
          perfil={{
            nombre: profile.nombre,
            apellido: profile.apellido,
            email: profile.navUser.email,
            codigoInstitucional: profile.codigoInstitucional,
            telefono: profile.telefono,
            departamento: profile.departamento,
            roles: profile.roles,
          }}
          stats={stats}
        />
      </ComunidadShell>
    );
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

  const lostFoundEnabled = await getLostFoundAccess();

  return (
    <OperativoShell user={profile.navUser} lostFoundEnabled={lostFoundEnabled}>
      {content}
    </OperativoShell>
  );
}