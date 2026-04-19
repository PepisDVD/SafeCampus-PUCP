import { GraduationCap, Monitor, Shield, Smartphone, Tablet } from "lucide-react";

import type { LoginRole, LoginRoleColor, LoginRoleStyle, MarketingAccessCard } from "./types";

export const LOGIN_ROLES: LoginRole[] = [
  {
    id: "comunidad",
    nombre: "Estudiante / Docente / Personal",
    descripcion: "Reporta incidentes, Lost & Found y acompanamiento seguro",
    ruta: "/reportar",
    tag: "PWA Comunidad",
    color: "blue",
    icono: GraduationCap,
    dispositivo: Smartphone,
  },
  {
    id: "operador",
    nombre: "Operador de Seguridad",
    descripcion: "Atiende y gestiona incidentes desde el tablero operativo movil",
    ruta: "/dashboard",
    tag: "App Movil",
    color: "orange",
    icono: Shield,
    dispositivo: Tablet,
  },
  {
    id: "supervisor",
    nombre: "Supervisor de Seguridad",
    descripcion: "Supervisa operaciones, KPIs y escala incidentes criticos",
    ruta: "/dashboard",
    tag: "Web Operativa",
    color: "navy",
    icono: Shield,
    dispositivo: Monitor,
  },
  {
    id: "admin",
    nombre: "Administrador del Sistema",
    descripcion: "Gestiona usuarios, roles, configuraciones e integraciones",
    ruta: "/usuarios",
    tag: "Web Operativa",
    color: "purple",
    icono: Shield,
    dispositivo: Monitor,
  },
];

export const LOGIN_ROLE_STYLES: Record<LoginRoleColor, LoginRoleStyle> = {
  blue: {
    border: "border-blue-400",
    badge: "bg-blue-100 text-blue-700",
    icon: "text-blue-600",
    ring: "ring-blue-400",
  },
  orange: {
    border: "border-orange-400",
    badge: "bg-orange-100 text-orange-700",
    icon: "text-orange-600",
    ring: "ring-orange-400",
  },
  navy: {
    border: "border-[#001C55]",
    badge: "bg-blue-950 text-blue-200",
    icon: "text-[#001C55]",
    ring: "ring-[#001C55]",
  },
  purple: {
    border: "border-purple-500",
    badge: "bg-purple-100 text-purple-700",
    icon: "text-purple-700",
    ring: "ring-purple-400",
  },
};

export const LOGIN_ACCESS_CARDS: MarketingAccessCard[] = [
  {
    icon: Smartphone,
    label: "PWA Comunidad",
    desc: "Estudiantes, docentes y personal",
  },
  {
    icon: Tablet,
    label: "App Movil Operador",
    desc: "Gestion tactica de campo",
  },
  {
    icon: Monitor,
    label: "Web Operativa",
    desc: "Supervision y administracion",
  },
];
