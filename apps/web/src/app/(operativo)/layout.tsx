import { redirect } from "next/navigation";

import { getLostFoundAccess } from "@/features/lost-found/service";
import { getCurrentUserProfile } from "@/lib/auth/server";
import { AdminShell } from "../(admin)/_components/admin-shell";
import { OperativoShell } from "./_components/operativo-shell";

const OPERATIVE_ROLES = new Set(["administrador", "supervisor", "operador"]);

export default async function OperativoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ambas peticiones son independientes: se lanzan en paralelo para no
  // encadenar dos round-trips al backend en la carga inicial del layout.
  const [profile, lostFoundEnabled] = await Promise.all([
    getCurrentUserProfile(),
    getLostFoundAccess(),
  ]);

  if (!profile) {
    redirect("/login?next=/dashboard");
  }

  if (!profile.roles.some((role) => OPERATIVE_ROLES.has(role))) {
    redirect("/inicio");
  }

  if (profile.roles.includes("administrador")) {
    return <AdminShell user={profile.navUser}>{children}</AdminShell>;
  }

  return (
    <OperativoShell user={profile.navUser} lostFoundEnabled={lostFoundEnabled}>
      {children}
    </OperativoShell>
  );
}
