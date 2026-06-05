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
  BotMessageSquare,
  ClipboardList,
  LayoutDashboard,
  Megaphone,
  MapPinned,
  MessageSquare,
  Map,
  PackageCheck,
  PackageSearch,
  Plug,
  Shield,
  ShieldCheck,
  Users,
} from "lucide-react";
import { OfficialLogoMark } from "@/components/branding/official-logo-mark";
import { signOut } from "@/lib/auth";

const ADMIN_NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    section: "Operacion",
  },
  {
    href: "/incidentes",
    label: "Incidentes",
    icon: ShieldCheck,
    section: "Operacion",
  },
  {
    href: "/lost-found-operaciones",
    label: "Lost & Found",
    icon: PackageSearch,
    section: "Operacion",
    children: [
      {
        href: "/lost-found-operaciones",
        label: "Dashboard",
        icon: BarChart3,
      },
      {
        href: "/lost-found-hilos",
        label: "Hilos",
        icon: MessageSquare,
      },
      {
        href: "/lost-found-logistica",
        label: "Logistica",
        icon: PackageCheck,
      },
      {
        href: "/lost-found-admin",
        label: "Configuracion",
        icon: ClipboardList,
      },
    ],
  },
  {
    href: "/mapa",
    label: "Mapa",
    icon: MapPinned,
    section: "Operacion",
  },
  {
    href: "/alertas",
    label: "Alertas",
    icon: Megaphone,
    section: "Operacion",
    children: [
      {
        href: "/alertas",
        label: "Consola",
        icon: Megaphone,
      },
      {
        href: "/alertas/reportes",
        label: "Reportes",
        icon: BarChart3,
      },
    ],
  },
  {
    href: "/kpis",
    label: "KPIs",
    icon: BarChart3,
    section: "Operacion",
  },
  {
    href: "/mensajes",
    label: "Mensajes",
    icon: MessageSquare,
    section: "Operacion",
  },
  {
    href: "/usuarios",
    label: "Usuarios",
    icon: Users,
    section: "Administracion",
  },
  {
    href: "/roles",
    label: "Roles y Permisos",
    icon: Shield,
    section: "Administracion",
  },
  {
    href: "/integraciones",
    label: "Integraciones",
    icon: Plug,
    section: "Administracion",
  },
  {
    href: "/maestros/ubicaciones",
    label: "Maestros",
    icon: Map,
    section: "Administracion",
    children: [
      {
        href: "/maestros/ubicaciones",
        label: "Ubicaciones",
        icon: MapPinned,
      },
    ],
  },
  {
    href: "/auditoria",
    label: "Auditoria",
    icon: ClipboardList,
    section: "Administracion",
  },
  {
    href: "/llm",
    label: "Uso de LLM",
    icon: BotMessageSquare,
    section: "Administracion",
    children: [
      { href: "/llm-dashboard", label: "Dashboard", icon: BarChart3 },
      { href: "/llm-audit", label: "Historial", icon: ClipboardList },
    ],
  },
];

type AdminShellProps = {
  user?: UserNavUser;
  children: React.ReactNode;
};

export function AdminShell({ user, children }: AdminShellProps) {
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
        appName="SafeCampus Control"
        AppLogo={OfficialLogoMark}
        navItems={ADMIN_NAV}
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
              Centro de control
            </p>
            <p className="hidden text-xs text-slate-500 sm:block">
              Operacion, seguridad y administracion del sistema
            </p>
          </div>
          <div className="flex-1" />
        </header>
        <main>{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
