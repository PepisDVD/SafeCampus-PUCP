/**
 * 📁 apps/web/src/app/(operativo)/incidentes/page.tsx
 * 🎯 Vista maestra de incidentes (supervisor / operador):
 *    búsqueda, filtros y tabla con datos reales del backend.
 * 📦 Módulo: Operativo / Incidentes
 *
 * Server Component: lee filtros desde la URL y consulta el backend (FastAPI →
 * sc_incidentes.incidente). No accede a la BD directamente.
 */

import { EstadoIncidente, NivelSeveridad } from "@safecampus/shared-types";

import { listarIncidentes } from "@/features/incidentes/service";

import { IncidentesFilters } from "./_components/incidentes-filters";
import { IncidentesTable } from "./_components/incidentes-table";

const SEVERIDAD_VALUES = new Set<string>(Object.values(NivelSeveridad));
const ESTADO_VALUES = new Set<string>(Object.values(EstadoIncidente));

function pickOne(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function IncidentesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const search = pickOne(params.search) ?? "";
  const rawSeveridad = pickOne(params.severidad);
  const rawEstado = pickOne(params.estado);

  const severidad =
    rawSeveridad && SEVERIDAD_VALUES.has(rawSeveridad)
      ? (rawSeveridad as NivelSeveridad)
      : null;
  const estado =
    rawEstado && ESTADO_VALUES.has(rawEstado)
      ? (rawEstado as EstadoIncidente)
      : null;

  const { items, total } = await listarIncidentes({
    search: search || undefined,
    severidad: severidad ?? undefined,
    estado: estado ?? undefined,
    limit: 100,
  }).catch(() => ({ items: [], total: 0 }));

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Casos</h1>
          <p className="mt-1 text-sm text-slate-500">
            {total} {total === 1 ? "incidente encontrado" : "incidentes encontrados"}
          </p>
        </div>

        {/* Toggle Tabla / Kanban — Kanban aún no implementado */}
        <div className="inline-flex rounded-full bg-slate-100 p-1">
          <button
            type="button"
            className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-slate-900 shadow-sm"
          >
            Tabla
          </button>
          <button
            type="button"
            disabled
            title="Próximamente"
            className="rounded-full px-4 py-1.5 text-sm font-medium text-slate-500 disabled:cursor-not-allowed"
          >
            Kanban
          </button>
        </div>
      </div>

      <IncidentesFilters
        search={search}
        severidad={severidad}
        estado={estado}
      />

      <IncidentesTable items={items} />
    </div>
  );
}