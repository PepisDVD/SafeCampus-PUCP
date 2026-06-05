import { redirect } from "next/navigation";

import { ComunidadShell } from "./_components/comunidad-shell";
import { getCurrentUserProfile } from "@/lib/auth/server";

const OPERATIVE_ROLES = new Set(["administrador", "supervisor", "operador"]);

export default async function ComunidadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login?next=/inicio");
  }

  if (profile.roles.some((role) => OPERATIVE_ROLES.has(role))) {
    redirect("/dashboard");
  }

  return <ComunidadShell>{children}</ComunidadShell>;
}
