import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Building2,
  ClipboardList,
  House,
  KeyRound,
  LifeBuoy,
  MapPinPlus,
  MapPinned,
  MessageSquare,
  PackageSearch,
  Server,
  Shield,
  Users,
} from "lucide-react";

export type AppRoleName = "comunidad" | "operador" | "supervisor" | "administrador";

export type AppNavLeaf = {
  href: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  roles: AppRoleName[];
};

export type AppNavItem = AppNavLeaf & {
  children?: AppNavLeaf[];
};

export const ADMIN_NAV_ITEMS: AppNavItem[] = [
  {
    href: "/usuarios",
    label: "Administración",
    icon: Building2,
    roles: ["administrador"],
    children: [
      {
        href: "/usuarios",
        label: "Usuarios",
        icon: Users,
        roles: ["administrador"],
      },
      {
        href: "/roles",
        label: "Roles y permisos",
        icon: KeyRound,
        roles: ["administrador"],
      },
      {
        href: "/integraciones",
        label: "Integraciones",
        icon: Server,
        roles: ["administrador"],
      },
      {
        href: "/auditoria",
        label: "Auditoría",
        icon: Activity,
        roles: ["administrador"],
      },
    ],
  },
];

export const OPERATIVO_NAV_ITEMS: AppNavItem[] = [
  { href: "/bienvenida", label: "Bienvenida", icon: House, roles: ["operador", "supervisor", "administrador"] },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3, roles: ["operador", "supervisor", "administrador"] },
  { href: "/incidentes", label: "Incidentes", icon: Shield, roles: ["operador", "supervisor", "administrador"] },
  { href: "/mapa", label: "Mapa", icon: MapPinned, roles: ["operador", "supervisor", "administrador"] },
  { href: "/kpis", label: "KPIs", icon: BarChart3, roles: ["supervisor", "administrador"] },
  { href: "/mensajes", label: "Mensajes", icon: MessageSquare, roles: ["operador", "supervisor", "administrador"] },
];

export const COMUNIDAD_NAV_ITEMS: AppNavItem[] = [
  { href: "/reportar", label: "Reportar", icon: MapPinPlus, roles: ["comunidad", "administrador"] },
  { href: "/mis-casos", label: "Mis casos", icon: ClipboardList, roles: ["comunidad", "administrador"] },
  { href: "/lost-found", label: "Lost & Found", icon: PackageSearch, roles: ["comunidad", "administrador"] },
  { href: "/acompanamiento", label: "Acompañamiento", icon: LifeBuoy, roles: ["comunidad", "administrador"] },
];

export const ADMIN_FULL_NAV_ITEMS: AppNavItem[] = [
  OPERATIVO_NAV_ITEMS[0]!,
  ...ADMIN_NAV_ITEMS,
  ...OPERATIVO_NAV_ITEMS.slice(1),
  ...COMUNIDAD_NAV_ITEMS,
];
