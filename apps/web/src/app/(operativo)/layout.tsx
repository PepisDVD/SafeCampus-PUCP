"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@safecampus/ui-kit";
import {
  Bell,
  BarChart3,
  House,
  LayoutDashboard,
  MapPinned,
  MessageSquare,
  Shield,
} from "lucide-react";

import { LogoutButton } from "@/features/auth/components";

const nav = [
  { href: "/bienvenida", label: "Bienvenida", icon: House },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/incidentes", label: "Incidentes", icon: Shield },
  { href: "/mapa", label: "Mapa", icon: MapPinned },
  { href: "/kpis", label: "KPIs", icon: BarChart3 },
  { href: "/mensajes", label: "Mensajes", icon: MessageSquare },
];

export default function OperativoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 md:grid md:grid-cols-[240px_1fr]">
      <aside className="hidden border-r bg-white md:block">
        <div className="flex items-center gap-2 border-b px-5 py-4 text-[#001C55]">
          <Shield className="h-5 w-5" />
          <p className="font-semibold">SafeCampus Operativo</p>
        </div>
        <nav className="space-y-1 p-3">
          {nav.map((item) => {
            const activo = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                  activo
                    ? "bg-[#001C55] text-white"
                    : "text-slate-600 hover:bg-slate-100",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-h-screen">
        <header className="sticky top-0 z-20 border-b bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Centro de operaciones</p>
            <div className="flex items-center gap-2">
              <button className="rounded-lg border p-2 text-muted-foreground hover:bg-muted">
                <Bell className="h-4 w-4" />
              </button>
              <LogoutButton />
            </div>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
