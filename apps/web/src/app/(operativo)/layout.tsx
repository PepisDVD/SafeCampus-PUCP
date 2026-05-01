import { getCurrentUserProfile } from "@/lib/auth/server";
import { OperativoShell } from "./_components/operativo-shell";

export default async function OperativoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentUserProfile();

  return <OperativoShell user={profile?.navUser}>{children}</OperativoShell>;
}
