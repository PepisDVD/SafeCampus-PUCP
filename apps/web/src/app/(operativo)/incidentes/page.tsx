/**
 * 📁 apps/web/src/app/(operativo)/incidentes/page.tsx
 * 🎯 Vista maestra de incidentes (supervisor / operador):
 *    búsqueda, filtros, tabla y kanban con datos reales del backend.
 * 📦 Módulo: Operativo / Incidentes
 *
 * Server Component: lee filtros + modo de vista desde la URL y consulta el
 * backend (FastAPI → sc_incidentes.incidente). No accede a la BD directamente.
 */

import { Suspense } from "react";

import { EstadoIncidente, NivelSeveridad } from "@safecampus/shared-types";

import { listarIncidentes } from "@/features/incidentes/service";

import { IncidentesFilters } from "./_components/incidentes-filters";
import { IncidentesKanban } from "./_components/incidentes-kanban";
import { IncidentesPagination } from "./_components/incidentes-pagination";
import { IncidentesTable } from "./_components/incidentes-table";
import { ViewToggle, type IncidentesView } from "./_components/view-toggle";

const SEVERIDAD_VALUES = new Set<string>(Object.values(NivelSeveridad));
const ESTADO_VALUES = new Set<string>(Object.values(EstadoIncidente));
const VIEW_VALUES = new Set<string>(["tabla", "kanban"]);
const PER_PAGE = 20;

function pickOne(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function pickComma(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return [];
  return raw.split(",").filter(Boolean);
}

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function IncidentesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const search = pickOne(params.search) ?? "";
  const rawView = pickOne(params.view);
  const rawPage = pickOne(params.page);

  const severidades = pickComma(params.severidad).filter((v) =>
    SEVERIDAD_VALUES.has(v),
  ) as NivelSeveridad[];
  const estados = pickComma(params.estado).filter((v) =>
    ESTADO_VALUES.has(v),
  ) as EstadoIncidente[];

  const view: IncidentesView =
    rawView && VIEW_VALUES.has(rawView) ? (rawView as IncidentesView) : "tabla";
  const page = Math.max(1, parseInt(rawPage ?? "1", 10) || 1);
  const skip = (page - 1) * PER_PAGE;

  const { items, total } = await listarIncidentes({
    search: search || undefined,
    severidades: severidades.length ? severidades : undefined,
    estados: estados.length ? estados : undefined,
    limit: PER_PAGE,
    skip,
  }).catch(() => ({ items: [], total: 0 }));

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="w-full min-w-0 space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Casos</h1>
          <p className="mt-1 text-sm text-slate-500">
            {total} {total === 1 ? "incidente encontrado" : "incidentes encontrados"}
          </p>
        </div>
        <ViewToggle current={view} />
      </div>

      <IncidentesFilters
        search={search}
        severidades={severidades}
        estados={estados}
        view={view}
      />

      {view === "kanban" ? (
        <IncidentesKanban items={items} />
      ) : (
        <IncidentesTable
          items={items}
          footer={
            <Suspense>
              <IncidentesPagination
                page={page}
                totalPages={totalPages}
                total={total}
                perPage={PER_PAGE}
              />
            </Suspense>
          }
        />
      )}
    </div>
  );
}