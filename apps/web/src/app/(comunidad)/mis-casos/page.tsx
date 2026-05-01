/**
 * 📁 apps/web/src/app/(comunidad)/mis-casos/page.tsx
 * 🎯 Lista de casos reportados por el usuario con estado y seguimiento.
 * 📦 Módulo: Comunidad / Mis Casos
 *
 * Server Component: obtiene la lista vía backend (API REST → BD).
 * No accede a la BD directamente.
 */

import Link from "next/link";
import { ChevronRight, Clock, MapPin, ShieldCheck } from "lucide-react";
import { EstadoIncidente, type IncidenteListItem } from "@safecampus/shared-types";
import { Badge, Card, cn } from "@safecampus/ui-kit";

import { listarMisIncidentes } from "@/features/incidentes/service";

const ESTADOS_RESUELTOS: ReadonlySet<EstadoIncidente> = new Set([
  EstadoIncidente.RESUELTO,
  EstadoIncidente.CERRADO,
]);

function formatFecha(iso: string | undefined | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toISOString().slice(0, 10);
  } catch {
    return "—";
  }
}

export default async function MisCasosPage() {
  const { items, total } = await listarMisIncidentes(50).catch(() => ({
    items: [] as IncidenteListItem[],
    total: 0,
  }));

  return (
    <div className="space-y-5 px-4 py-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mis reportes</h1>
        <p className="mt-1 text-sm text-slate-500">
          {total} {total === 1 ? "incidente registrado" : "incidentes registrados"}
        </p>
      </div>

      {items.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-slate-500">
            Todavía no tienes reportes registrados.
          </p>
          <Link
            href="/reportar"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#001C55]"
          >
            Reportar un incidente <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((reporte) => {
            const resuelto = ESTADOS_RESUELTOS.has(reporte.estado);
            return (
              <Link key={reporte.id} href={`/mis-casos/${reporte.codigo}`}>
                <Card className="p-4 transition active:scale-[0.99] hover:shadow-sm">
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                        resuelto ? "bg-emerald-500" : "bg-amber-500",
                      )}
                      aria-hidden
                    />

                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-500">
                          {reporte.codigo}
                        </p>
                        <div className="flex items-center gap-1">
                          {resuelto ? (
                            <Badge className="border-0 bg-emerald-100 text-[10px] font-medium text-emerald-800 hover:bg-emerald-100">
                              <ShieldCheck className="mr-1 h-2.5 w-2.5" /> Resuelto
                            </Badge>
                          ) : (
                            <Badge className="border-0 bg-amber-100 text-[10px] font-medium text-amber-800 hover:bg-amber-100">
                              <Clock className="mr-1 h-2.5 w-2.5" /> En atención
                            </Badge>
                          )}
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>

                      <p className="text-sm font-bold text-slate-900">
                        {reporte.titulo}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {reporte.lugar_referencia ?? "Sin ubicación"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatFecha(reporte.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}