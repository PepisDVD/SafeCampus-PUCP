import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/server";
import { AdminShell } from "./_components/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login?next=/usuarios");
  }

  if (!profile.roles.includes("administrador")) {
    redirect("/dashboard?error=forbidden");
  }

  return <AdminShell user={profile.navUser}>{children}</AdminShell>;
}
