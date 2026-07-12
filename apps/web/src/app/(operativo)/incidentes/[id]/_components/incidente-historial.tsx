/**
 * 📁 apps/web/src/app/(operativo)/incidentes/[id]/_components/incidente-historial.tsx
 * 🎯 Timeline vertical con los eventos del historial de un incidente.
 * 📦 Módulo: Operativo / Incidentes / Detalle
 */

import { ArrowRight, History } from "lucide-react";
import type { HistorialEvento } from "@safecampus/shared-types";
import { Badge, cn } from "@safecampus/ui-kit";

import { ESTADO_STYLE, getInitials } from "@/features/incidentes/presentation";
import { formatLimaDateTime } from "@/lib/lima-date";

type Props = {
  historial: HistorialEvento[];
};

function formatFecha(iso: string): string {
  return formatLimaDateTime(iso, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }, iso);
}

export function IncidenteHistorial({ historial }: Props) {
  if (historial.length === 0) {
    return (
      <div className="py-8 text-center">
        <History className="mx-auto mb-2 h-6 w-6 text-slate-300" />
        <p className="text-sm text-slate-500">
          Aún no hay eventos en el historial de este incidente.
        </p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-5 border-l-2 border-slate-200 pl-6">
      {historial.map((evento) => {
        const styleNuevo = ESTADO_STYLE[evento.estado_nuevo];
        const styleAnterior = evento.estado_anterior
          ? ESTADO_STYLE[evento.estado_anterior]
          : null;

        return (
          <li key={evento.id} className="relative">
            <span
              aria-hidden
              className="absolute top-1.5 -left-[31px] flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-[#001C55] ring-2 ring-slate-200"
            />
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                {styleAnterior ? (
                  <>
                    <Badge
                      className={cn(
                        "rounded-full border-0 px-2 py-0.5 text-[10px] font-medium",
                        styleAnterior.className,
                      )}
                    >
                      {styleAnterior.label}
                    </Badge>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                  </>
                ) : null}
                <Badge
                  className={cn(
                    "rounded-full border-0 px-2 py-0.5 text-[10px] font-medium",
                    styleNuevo.className,
                  )}
                >
                  {styleNuevo.label}
                </Badge>
                <span className="ml-auto text-xs text-slate-500">
                  {formatFecha(evento.created_at)}
                </span>
              </div>

              <p className="mt-2 text-sm font-semibold text-slate-900">
                {evento.accion}
              </p>
              {evento.comentario && (
                <p className="mt-1 text-sm text-slate-600">
                  {evento.comentario}
                </p>
              )}

              {evento.ejecutado_por && (
                <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                  {evento.ejecutado_por.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={evento.ejecutado_por.avatar_url}
                      alt={evento.ejecutado_por.nombre_completo}
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#001C55]/10 text-[10px] font-bold text-[#001C55]">
                      {getInitials(evento.ejecutado_por.nombre_completo)}
                    </span>
                  )}
                  <span className="text-xs text-slate-500">
                    Por{" "}
                    <span className="font-medium text-slate-700">
                      {evento.ejecutado_por.nombre_completo}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
