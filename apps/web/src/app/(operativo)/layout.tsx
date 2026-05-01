import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/server";
import { AdminShell } from "../(admin)/_components/admin-shell";
import { OperativoShell } from "./_components/operativo-shell";

export default async function OperativoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login?next=/dashboard");
  }

  if (profile.roles.includes("administrador")) {
    return <AdminShell user={profile.navUser}>{children}</AdminShell>;
  }

  return <OperativoShell user={profile.navUser}>{children}</OperativoShell>;
}
