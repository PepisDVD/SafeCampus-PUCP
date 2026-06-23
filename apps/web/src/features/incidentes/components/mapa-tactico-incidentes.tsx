"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AlertTriangle, ExternalLink, Filter } from "lucide-react";
import {
  EstadoIncidente,
  NivelSeveridad,
  type IncidenteMapaItem,
  type IncidenteMapaResponse,
} from "@safecampus/shared-types";
import {
  Badge,
  Button,
  Card,
  FilterBar,
  MultiSelectFilter,
  Switch,
  cn,
} from "@safecampus/ui-kit";

import {
  ESTADO_STYLE,
  SEVERIDAD_COLOR,
  SEVERIDAD_LABEL,
  formatCategoria,
} from "@/features/incidentes/presentation";
import { formatFechaLima } from "@/features/incidentes/format-fecha";

type MapaTacticoIncidentesProps = {
  data: IncidenteMapaResponse;
};

const LeafletIncidentesMap = dynamic(
  () =>
    import("@/features/incidentes/components/leaflet-incidentes-map").then(
      (mod) => mod.LeafletIncidentesMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[520px] items-center justify-center bg-slate-100 text-sm text-slate-500">
        Cargando mapa del campus PUCP...
      </div>
    ),
  },
);

const ESTADOS: EstadoIncidente[] = [
  EstadoIncidente.RECIBIDO,
  EstadoIncidente.EN_EVALUACION,
  EstadoIncidente.EN_ATENCION,
  EstadoIncidente.ESCALADO,
  EstadoIncidente.PENDIENTE_INFO,
  EstadoIncidente.RESUELTO,
  EstadoIncidente.CERRADO,
];

const SEVERIDADES: NivelSeveridad[] = [
  NivelSeveridad.BAJO,
  NivelSeveridad.MEDIO,
  NivelSeveridad.ALTO,
  NivelSeveridad.CRITICO,
];

function hasCoords(item: IncidenteMapaItem) {
  return item.latitud !== null && item.longitud !== null;
}

export function MapaTacticoIncidentes({
  data,
}: MapaTacticoIncidentesProps) {
  const [estados, setEstados] = useState<EstadoIncidente[]>([]);
  const [severidades, setSeveridades] = useState<NivelSeveridad[]>([]);
  const [soloActivos, setSoloActivos] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(
    data.items.find(hasCoords)?.id ?? null,
  );

  const filtered = useMemo(() => {
    return data.items.filter((item) => {
      if (estados.length && !estados.includes(item.estado)) return false;
      if (
        severidades.length &&
        (!item.severidad || !severidades.includes(item.severidad))
      ) {
        return false;
      }
      if (
        soloActivos &&
        [EstadoIncidente.RESUELTO, EstadoIncidente.CERRADO].includes(item.estado)
      ) {
        return false;
      }
      return true;
    });
  }, [data.items, estados, severidades, soloActivos]);

  const georef = filtered.filter(hasCoords);
  const sinCoords = filtered.filter((item) => !hasCoords(item));
  const selected =
    filtered.find((item) => item.id === selectedId) ?? georef[0] ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Mapa táctico de incidentes
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Visualización operativa por ubicación, severidad y estado.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <Card className="px-4 py-2">
            <p className="font-bold text-slate-900">{filtered.length}</p>
            <p className="text-slate-500">Total</p>
          </Card>
          <Card className="px-4 py-2">
            <p className="font-bold text-emerald-700">{georef.length}</p>
            <p className="text-slate-500">Con GPS</p>
          </Card>
          <Card className="px-4 py-2">
            <p className="font-bold text-amber-700">{sinCoords.length}</p>
            <p className="text-slate-500">Sin GPS</p>
          </Card>
        </div>
      </div>

      <FilterBar>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Filter className="h-4 w-4 text-[#001C55]" />
            Filtros
          </div>
          <MultiSelectFilter
            className="w-full sm:w-[190px]"
            placeholder="Todos los estados"
            options={ESTADOS.map((item) => ({ value: item, label: ESTADO_STYLE[item].label }))}
            selected={estados}
            onChange={setEstados}
          />
          <MultiSelectFilter
            className="w-full sm:w-[190px]"
            placeholder="Todas las severidades"
            options={SEVERIDADES.map((item) => ({ value: item, label: SEVERIDAD_LABEL[item] }))}
            selected={severidades}
            onChange={setSeveridades}
          />
          <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
            <Switch checked={soloActivos} onCheckedChange={setSoloActivos} />
            Solo activos
          </label>
        </div>
      </FilterBar>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_420px]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="relative min-h-[520px]">
            <LeafletIncidentesMap
              incidents={georef}
              selectedId={selected?.id ?? null}
              onSelect={setSelectedId}
            />
            {georef.length === 0 && (
              <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center">
                <Card className="max-w-sm p-5 text-center">
                  <AlertTriangle className="mx-auto mb-2 h-7 w-7 text-amber-500" />
                  <p className="text-sm font-medium text-slate-800">
                    No hay incidentes con coordenadas para los filtros actuales.
                  </p>
                </Card>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <Card className="p-4">
            {selected ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-semibold text-slate-500">
                      {selected.codigo}
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-slate-900">
                      {selected.titulo}
                    </h2>
                  </div>
                  <Badge
                    className={cn(
                      "border-0",
                      ESTADO_STYLE[selected.estado].className,
                    )}
                  >
                    {ESTADO_STYLE[selected.estado].label}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selected.severidad && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          SEVERIDAD_COLOR[selected.severidad],
                        )}
                      />
                      {SEVERIDAD_LABEL[selected.severidad]}
                    </span>
                  )}
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {formatCategoria(selected.categoria)}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>{selected.lugar_referencia ?? "Sin referencia textual"}</p>
                  <p>Reportado: {formatFechaLima(selected.created_at)}</p>
                  {hasCoords(selected) && (
                    <p className="font-mono text-xs">
                      {selected.latitud?.toFixed(6)},{" "}
                      {selected.longitud?.toFixed(6)}
                    </p>
                  )}
                </div>
                <Button asChild className="w-full gap-2 bg-[#001C55] hover:bg-[#032E84]">
                  <Link href={`/incidentes/${selected.id}`}>
                    <ExternalLink className="h-4 w-4" />
                    Abrir expediente
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Selecciona un marcador para ver el resumen del incidente.
              </p>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Incidentes sin ubicación precisa
            </h2>
            <div className="mt-3 max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {sinCoords.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Todos los incidentes filtrados tienen coordenadas.
                </p>
              ) : (
                sinCoords.map((item) => (
                  <Link
                    key={item.id}
                    href={`/incidentes/${item.id}`}
                    className="block rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs font-semibold text-slate-500">
                          {item.codigo}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {item.titulo}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.lugar_referencia ?? "Sin referencia"}
                        </p>
                      </div>
                      {item.severidad && (
                        <span
                          className={cn(
                            "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                            SEVERIDAD_COLOR[item.severidad],
                          )}
                        />
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
