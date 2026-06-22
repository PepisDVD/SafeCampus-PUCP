import * as React from "react";

import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";

const ROLE_TONES: Record<string, string> = {
  administrador: "border-violet-200 bg-violet-50 text-violet-700",
  supervisor: "border-blue-200 bg-blue-50 text-blue-700",
  operador: "border-orange-200 bg-orange-50 text-orange-700",
  comunidad: "border-emerald-200 bg-emerald-50 text-emerald-700",
  estudiante: "border-cyan-200 bg-cyan-50 text-cyan-700",
};

function normalizeRole(role: string): string {
  return role.trim().toLocaleLowerCase("es-PE");
}

function formatRoleLabel(role: string): string {
  const normalized = normalizeRole(role).replace(/[_-]+/g, " ");
  return normalized
    ? normalized.charAt(0).toLocaleUpperCase("es-PE") + normalized.slice(1)
    : "Sin rol";
}

function getRoleTone(role: string): string {
  return ROLE_TONES[normalizeRole(role)] ?? "border-slate-200 bg-slate-50 text-slate-700";
}

type RoleBadgeProps = Omit<React.ComponentProps<typeof Badge>, "children"> & {
  role: string;
  label?: string;
};

function RoleBadge({ role, label, className, ...props }: RoleBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", getRoleTone(role), className)}
      {...props}
    >
      {label ?? formatRoleLabel(role)}
    </Badge>
  );
}

export { RoleBadge, formatRoleLabel, getRoleTone, type RoleBadgeProps };
