"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AppSidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  type NavItem,
  type UserNavUser,
} from "@safecampus/ui-kit";
import {
  BarChart3,
  LayoutDashboard,
  Megaphone,
  MapPinned,
  MessageSquare,
  PackageCheck,
  PackageSearch,
  ShieldCheck,
} from "lucide-react";
import { OfficialLogoMark } from "@/components/branding/official-logo-mark";
import { NotificationPopover } from "@/features/notificaciones/components/notification-popover";
import { signOut } from "@/lib/auth";

const OPERATIVO_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/incidentes", label: "Incidentes", icon: ShieldCheck },
  {
    href: "/lost-found-operaciones",
    label: "Lost & Found",
    icon: PackageSearch,
    children: [
      { href: "/lost-found-operaciones", label: "Dashboard", icon: BarChart3 },
      { href: "/lost-found-hilos", label: "Hilos", icon: MessageSquare },
      { href: "/lost-found-logistica", label: "Logistica", icon: PackageCheck },
    ],
  },
  { href: "/mapa", label: "Mapa", icon: MapPinned },
  {
    href: "/alertas",
    label: "Alertas",
    icon: Megaphone,
    children: [
      { href: "/alertas", label: "Consola", icon: Megaphone },
      { href: "/alertas/reportes", label: "Reportes", icon: BarChart3 },
    ],
  },
  { href: "/kpis", label: "KPIs", icon: BarChart3 },
  { href: "/mensajes", label: "Mensajes", icon: MessageSquare },
];

type OperativoShellProps = {
  user?: UserNavUser;
  children: React.ReactNode;
};

export function OperativoShell({ user, children }: OperativoShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      // silent
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar
        appName="SafeCampus Operativo"
        AppLogo={OfficialLogoMark}
        navItems={OPERATIVO_NAV}
        pathname={pathname}
        user={user}
        onLogout={handleLogout}
        editProfileHref="/perfil"
        LinkComponent={Link}
      />
      <SidebarInset className="bg-[#f7f8fb]">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1 size-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[#001C55]" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              Centro de operaciones
            </p>
            <p className="hidden text-xs text-slate-500 sm:block">
              Monitoreo, incidentes y respuesta en campus
            </p>
          </div>
          <div className="flex-1" />
          <NotificationPopover incidentBaseHref="/incidentes" />
        </header>
        <main className="min-w-0 overflow-x-hidden">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
