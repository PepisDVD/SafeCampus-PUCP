/**
 * 📁 apps/web/src/app/(admin)/layout.tsx
 * 🎯 Layout del panel de administración (UC-GU-01..07).
 *    Monta el AdminPanelProvider (estado compartido de usuarios, RBAC,
 *    integraciones y auditoría) y renderiza una barra lateral con
 *    navegación activa entre tabs.
 * 📦 Módulo: Admin / Layout
 */

import { Toaster } from "@safecampus/ui-kit";

import { LogoutButton } from "@/features/auth/components";
import { AdminPanelProvider } from "@/features/admin-panel";

import { AdminSidebar } from "./_components/admin-sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminPanelProvider>
      <div className="min-h-screen bg-slate-50 md:flex">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                SafeCampus · Panel de administración
              </p>
              <h1 className="text-sm font-semibold text-slate-800">
                Gestión de usuarios y seguridad del sistema
              </h1>
            </div>
            <LogoutButton />
          </header>
          <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
        </div>
      </div>
      <Toaster richColors position="top-right" />
    </AdminPanelProvider>
  );
}
