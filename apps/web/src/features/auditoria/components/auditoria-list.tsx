/**
 * 📁 apps/web/src/features/auditoria/components/auditoria-list.tsx
 * 🎯 Timeline vertical de eventos de auditoría con icono por tipo.
 * 📦 Feature: Auditoría
 */

"use client";

import {
  Activity,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  UserCog,
  UserPlus,
} from "lucide-react";

import type { EventoAuditoria, TipoEventoAuditoria } from "../types";

const ICONOS: Record<
  TipoEventoAuditoria,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  usuario_creado: { icon: UserPlus, color: "bg-blue-100 text-blue-700" },
  usuario_editado: { icon: UserCog, color: "bg-slate-100 text-slate-700" },
  usuario_suspendido: { icon: ShieldOff, color: "bg-red-100 text-red-700" },
  usuario_reactivado: { icon: ShieldCheck, color: "bg-emerald-100 text-emerald-700" },
  rbac_modificado: { icon: Activity, color: "bg-purple-100 text-purple-700" },
  integracion_verificada: { icon: RefreshCw, color: "bg-emerald-100 text-emerald-700" },
  integracion_alerta: { icon: AlertTriangle, color: "bg-amber-100 text-amber-700" },
  otro: { icon: Activity, color: "bg-slate-100 text-slate-700" },
};

interface Props {
  eventos: EventoAuditoria[];
}

export function AuditoriaList({ eventos }: Props) {
  if (eventos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
        <p className="text-sm text-muted-foreground">
          No hay eventos que coincidan con los filtros actuales.
        </p>
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {eventos.map((ev) => {
        const { icon: Icon, color } = ICONOS[ev.tipo];
        return (
          <li
            key={ev.id}
            className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${color}`}
              aria-hidden
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">{ev.accion}</p>
                <time className="font-mono text-xs text-muted-foreground">
                  {ev.timestamp}
                </time>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Actor: <span className="font-medium text-slate-700">{ev.actor}</span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {ev.detalle}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
