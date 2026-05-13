"use client";

import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  NivelSeveridad,
  type IncidenteMapaItem,
} from "@safecampus/shared-types";
import { Button, cn } from "@safecampus/ui-kit";

import {
  ESTADO_STYLE,
  SEVERIDAD_LABEL,
  formatCategoria,
} from "@/features/incidentes/presentation";

type LeafletIncidentesMapProps = {
  incidents: IncidenteMapaItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const PUCP_CENTER: [number, number] = [-12.06945, -77.08055];
const PUCP_BOUNDS: LatLngBoundsExpression = [
  [-12.0738, -77.0854],
  [-12.0658, -77.0768],
];

const SEVERIDAD_HEX: Record<NivelSeveridad, string> = {
  [NivelSeveridad.BAJO]: "#10b981",
  [NivelSeveridad.MEDIO]: "#f59e0b",
  [NivelSeveridad.ALTO]: "#f97316",
  [NivelSeveridad.CRITICO]: "#ef4444",
};

function markerColor(item: IncidenteMapaItem) {
  return item.severidad ? SEVERIDAD_HEX[item.severidad] : "#64748b";
}

function formatFecha(iso: string | null): string {
  if (!iso) return "Sin fecha";
  try {
    return new Date(iso).toLocaleString("es-PE", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function LeafletIncidentesMap({
  incidents,
  selectedId,
  onSelect,
}: LeafletIncidentesMapProps) {
  return (
    <MapContainer
      center={PUCP_CENTER}
      zoom={17}
      minZoom={15}
      maxZoom={19}
      maxBounds={PUCP_BOUNDS}
      scrollWheelZoom
      className="h-full min-h-[520px] w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {incidents.map((item) => {
        if (item.latitud === null || item.longitud === null) return null;

        const selected = selectedId === item.id;
        const color = markerColor(item);
        const estadoStyle = ESTADO_STYLE[item.estado];

        return (
          <CircleMarker
            key={item.id}
            center={[item.latitud, item.longitud]}
            radius={selected ? 13 : 9}
            pathOptions={{
              color: selected ? "#001C55" : "#ffffff",
              fillColor: color,
              fillOpacity: 0.92,
              opacity: 1,
              weight: selected ? 4 : 2,
            }}
            eventHandlers={{
              click: () => onSelect(item.id),
            }}
          >
            <Popup>
              <div className="w-64 space-y-2">
                <div>
                  <p className="font-mono text-xs font-semibold text-slate-500">
                    {item.codigo}
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {item.titulo}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      estadoStyle.className,
                    )}
                  >
                    {estadoStyle.label}
                  </span>
                  {item.severidad && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {SEVERIDAD_LABEL[item.severidad]}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600">
                  {formatCategoria(item.categoria)}
                </p>
                <p className="text-xs text-slate-600">
                  {item.lugar_referencia ?? "Sin referencia textual"}
                </p>
                <p className="text-xs text-slate-500">
                  Reportado: {formatFecha(item.created_at)}
                </p>
                <Button asChild size="sm" className="w-full gap-1.5 bg-[#001C55] hover:bg-[#032E84]">
                  <Link href={`/incidentes/${item.id}`}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir expediente
                  </Link>
                </Button>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
