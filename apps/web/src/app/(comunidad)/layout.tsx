"use client";

import { ADMIN_FULL_NAV_ITEMS, AppShell } from "@/components/layout";

export default function ComunidadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      appTitle="Comunidad SafeCampus"
      appSubtitle="Reportes y seguimiento ciudadano"
      navItems={ADMIN_FULL_NAV_ITEMS}
    >
      {children}
    </AppShell>
  );
}
