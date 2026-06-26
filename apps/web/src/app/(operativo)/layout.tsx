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
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login?next=/dashboard");
  }

  if (!profile.roles.some((role) => OPERATIVE_ROLES.has(role))) {
    redirect("/inicio");
  }

  if (profile.roles.includes("administrador")) {
    return <AdminShell user={profile.navUser}>{children}</AdminShell>;
  }

  // Solo los supervisores asignados al módulo Lost & Found ven su entrada en el sidebar.
  const lostFoundEnabled = await getLostFoundAccess();

  return (
    <OperativoShell user={profile.navUser} lostFoundEnabled={lostFoundEnabled}>
      {children}
    </OperativoShell>
  );
}
