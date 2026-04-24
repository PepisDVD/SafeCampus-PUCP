/**
 * 📁 apps/web/src/app/(admin)/_components/admin-sidebar.tsx
 * 🎯 Sidebar del panel admin con navegación entre las 4 secciones:
 *    Usuarios · Roles y permisos · Integraciones · Auditoría.
 *    Resalta la ruta activa usando `usePathname`.
 * 📦 Módulo: Admin / Layout
 */

"use client";

import { Activity, KeyRound, Server, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@safecampus/ui-kit";

type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV: NavItem[] = [
  {
    href: "/usuarios",
    label: "Usuarios",
    description: "Alta, edición y suspensión",
    icon: Users,
  },
  {
    href: "/roles",
    label: "Roles y permisos",
    description: "Matriz RBAC v1.0",
    icon: KeyRound,
  },
  {
    href: "/integraciones",
    label: "Integraciones",
    description: "OpenAI · WhatsApp · Maps",
    icon: Server,
  },
  {
    href: "/auditoria",
    label: "Auditoría",
    description: "Log centralizado",
    icon: Activity,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 shrink-0 border-r bg-white md:flex md:flex-col">
      <div className="flex items-center gap-2 border-b px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#001C55] text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">SafeCampus</p>
          <p className="text-xs text-muted-foreground">Administración</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => {
          const active = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-[#001C55] text-white shadow-sm"
                  : "text-slate-700 hover:bg-slate-100",
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  active ? "text-white" : "text-slate-500",
                )}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="font-medium leading-tight">{item.label}</p>
                <p
                  className={cn(
                    "text-xs leading-tight",
                    active ? "text-white/70" : "text-muted-foreground",
                  )}
                >
                  {item.description}
                </p>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="border-t px-5 py-4 text-xs text-muted-foreground">
        <p className="font-medium text-slate-700">Solo Administradores</p>
        <p className="mt-1 leading-relaxed">
          Este panel implementa UC-GU-02 a UC-GU-07 de SafeCampus PUCP.
        </p>
      </div>
    </aside>
  );
}
