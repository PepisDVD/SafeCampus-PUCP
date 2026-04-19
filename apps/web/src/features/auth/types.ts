import type { LucideIcon } from "lucide-react";

export type LoginRoleId = "comunidad" | "operador" | "supervisor" | "admin";
export type LoginRoleColor = "blue" | "orange" | "navy" | "purple";
export type LoginChannelTag = "PWA Comunidad" | "App Movil" | "Web Operativa";

export type LoginRole = {
  id: LoginRoleId;
  nombre: string;
  descripcion: string;
  ruta: string;
  tag: LoginChannelTag;
  color: LoginRoleColor;
  icono: LucideIcon;
  dispositivo: LucideIcon;
};

export type LoginRoleStyle = {
  border: string;
  badge: string;
  icon: string;
  ring: string;
};

export type MarketingAccessCard = {
  label: string;
  desc: string;
  icon: LucideIcon;
};
