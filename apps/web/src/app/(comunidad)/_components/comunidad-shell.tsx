"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, LifeBuoy, MapPinPlus, PackageSearch, UserCircle2 } from "lucide-react";
import { cn } from "@safecampus/ui-kit";

import { LogoutButton } from "@/features/auth/components";

const items = [
  { href: "/reportar", label: "Reportar", icon: MapPinPlus },
  { href: "/mis-casos", label: "Mis casos", icon: ClipboardList },
  { href: "/lost-found", label: "Lost & Found", icon: PackageSearch },
  { href: "/acompanamiento", label: "Acompanamiento", icon: LifeBuoy },
  { href: "/perfil", label: "Perfil", icon: UserCircle2 },
];

type ComunidadShellProps = {
  children: React.ReactNode;
};

export function ComunidadShell({ children }: ComunidadShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Comunidad SafeCampus</p>
            <p className="text-xs text-slate-500">Reportes, acompanamiento y perfil personal</p>
          </div>
          <LogoutButton className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl pb-20">{children}</main>
      <nav className="fixed right-0 bottom-0 left-0 border-t bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-5xl grid-cols-5 px-2 py-2">
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
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
