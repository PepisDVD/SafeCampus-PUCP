"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@safecampus/ui-kit";
import { ClipboardList, LifeBuoy, MapPinPlus, PackageSearch } from "lucide-react";

import { LogoutButton } from "@/features/auth/components";

const items = [
  { href: "/reportar", label: "Reportar", icon: MapPinPlus },
  { href: "/mis-casos", label: "Mis casos", icon: ClipboardList },
  { href: "/lost-found", label: "Lost & Found", icon: PackageSearch },
  { href: "/acompanamiento", label: "Acompanamiento", icon: LifeBuoy },
];

export default function ComunidadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <p className="text-sm text-muted-foreground">Comunidad SafeCampus</p>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl">{children}</main>
      <nav className="fixed right-0 bottom-0 left-0 border-t bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-5xl grid-cols-4 px-2 py-2">
          {items.map((item) => {
            const activo = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg py-2 text-[11px] font-medium",
                  activo
                    ? "text-[#001C55] bg-[#001C55]/8"
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
