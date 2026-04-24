/**
 * 📁 apps/web/src/features/usuarios/components/usuario-stats-cards.tsx
 * 🎯 Tarjetas de métricas agregadas de usuarios (total, activos, etc).
 * 📦 Feature: Usuarios
 */

"use client";

import { Activity, ShieldOff, UserMinus, Users } from "lucide-react";
import { Card, CardContent } from "@safecampus/ui-kit";

import type { UsuarioStats } from "../types";

interface Props {
  stats: UsuarioStats;
}

const CARDS: Array<{
  key: keyof UsuarioStats;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
}> = [
  { key: "total", label: "Total de cuentas", icon: Users, iconClass: "text-blue-700" },
  { key: "activos", label: "Activos", icon: Activity, iconClass: "text-emerald-600" },
  { key: "inactivos", label: "Inactivos", icon: UserMinus, iconClass: "text-slate-500" },
  { key: "suspendidos", label: "Suspendidos", icon: ShieldOff, iconClass: "text-red-600" },
];

export function UsuarioStatsCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {CARDS.map(({ key, label, icon: Icon, iconClass }) => (
        <Card key={key} className="border-slate-200">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{stats[key]}</p>
            </div>
            <Icon className={`h-8 w-8 ${iconClass}`} aria-hidden />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
