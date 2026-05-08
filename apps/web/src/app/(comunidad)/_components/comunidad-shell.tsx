"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  Bell,
  Home,
  MapPinPlus,
  PackageSearch,
  Shield,
  UserCircle2,
} from "lucide-react";
import { cn } from "@safecampus/ui-kit";

import { LogoutButton } from "@/features/auth/components";
import { NotificationBadge } from "@/features/notificaciones/components/notification-badge";

const items = [
  { href: "/inicio", label: "Inicio", icon: Home },
  { href: "/reportar", label: "Reportar", icon: MapPinPlus },
  { href: "/mis-casos", label: "Mis casos", icon: ClipboardList },
  { href: "/notificaciones", label: "Avisos", icon: Bell },
  { href: "/lost-found", label: "Lost & Found", icon: PackageSearch },
  { href: "/perfil", label: "Perfil", icon: UserCircle2 },
];

type ComunidadShellProps = {
  children: React.ReactNode;
};

export function ComunidadShell({ children }: ComunidadShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 bg-[#001C55] px-4 py-3 text-white shadow-md">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold">SafeCampus</p>
              <p className="text-[11px] text-white/70">PUCP</p>
            </div>
          </div>
          <LogoutButton className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/30 bg-transparent px-3 text-xs font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-md pb-24">{children}</main>

      <nav className="fixed right-0 bottom-0 left-0 border-t bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-6 px-2 py-2">
          {items.map((item) => {
            const activo = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg py-2 text-[11px] font-medium",
                  activo
                    ? "bg-[#001C55]/8 text-[#001C55]"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                <span className="relative">
                  <item.icon className="h-5 w-5" />
                  {item.href === "/notificaciones" && <NotificationBadge />}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
