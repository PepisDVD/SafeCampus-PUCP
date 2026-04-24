"use client";

import { ADMIN_FULL_NAV_ITEMS, AppShell } from "@/components/layout";

export default function OperativoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      appTitle="Centro de operaciones"
      appSubtitle="SafeCampus Web Operativa"
      navItems={ADMIN_FULL_NAV_ITEMS}
    >
      {children}
    </AppShell>
  );
}
