"use client";

import { ADMIN_FULL_NAV_ITEMS, AppShell } from "@/components/layout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      appTitle="Panel de administración"
      appSubtitle="Gestión de usuarios y seguridad"
      navItems={ADMIN_FULL_NAV_ITEMS}
    >
      {children}
    </AppShell>
  );
}
