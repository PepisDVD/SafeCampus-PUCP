"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Flame } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@safecampus/ui-kit";
import { EstadoIncidente, type IncidenteMapaItem } from "@safecampus/shared-types";

const LeafletHeatmap = dynamic(
  () =>
    import("./leaflet-incidentes-heatmap").then(
      (m) => m.LeafletIncidentesHeatmap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-full animate-pulse rounded-b-xl bg-slate-100" />
    ),
  },
);

type MapaFiltro = "historico" | "activos";

const ESTADOS_TERMINALES = new Set<EstadoIncidente>([
  EstadoIncidente.RESUELTO,
  EstadoIncidente.CERRADO,
]);

const FILTROS: { id: MapaFiltro; label: string }[] = [
  { id: "historico", label: "Histórico" },
  { id: "activos",   label: "Activos"   },
];

type IncidentesHeatmapCardProps = {
  items: IncidenteMapaItem[];
};

export function IncidentesHeatmapCard({ items }: IncidentesHeatmapCardProps) {
  const [filtro, setFiltro] = useState<MapaFiltro>("historico");

  const filtrados =
    filtro === "activos"
      ? items.filter((i) => !ESTADOS_TERMINALES.has(i.estado))
      : items;

  const conCoordenadas = filtrados.filter(
    (i) => i.latitud !== null && i.longitud !== null,
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="h-4 w-4 text-[#001C55]" />
              Mapa de calor — zonas con más incidentes
            </CardTitle>
            <CardDescription className="mt-1">
              {conCoordenadas.length} incidente
              {conCoordenadas.length !== 1 ? "s" : ""} georreferenciados.
              Intensidad por severidad.
            </CardDescription>
          </div>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  filtro === f.id
                    ? "bg-white text-[#001C55] shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[280px]">
          {conCoordenadas.length === 0 ? (
            <div className="flex h-full items-center justify-center bg-slate-50 text-sm text-muted-foreground">
              Sin incidentes geolocalizados para este filtro.
            </div>
          ) : (
            <LeafletHeatmap items={filtrados} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
