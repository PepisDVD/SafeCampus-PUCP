"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import type { IncidenteMapaItem } from "@safecampus/shared-types";

declare module "leaflet" {
  function heatLayer(
    latlngs: [number, number, number?][],
    options?: {
      minOpacity?: number;
      maxZoom?: number;
      max?: number;
      radius?: number;
      blur?: number;
      gradient?: Record<number, string>;
    },
  ): L.Layer;
}

const PUCP_CENTER: [number, number] = [-12.06945, -77.08055];
const PUCP_BOUNDS: LatLngBoundsExpression = [
  [-12.0738, -77.0854],
  [-12.0658, -77.0768],
];

const SEVERIDAD_WEIGHT: Record<string, number> = {
  CRITICO: 1.0,
  ALTO: 0.7,
  MEDIO: 0.4,
  BAJO: 0.2,
};

function InvalidateSizeOnResize() {
  const map = useMap();

  useEffect(() => {
    // Recalcula el tamaño del mapa (y del canvas del heatmap) en cuanto el
    // contenedor cambia de dimensiones; evita que el calor quede recortado.
    const container = map.getContainer();
    map.invalidateSize();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
}

function HeatLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    const layer = L.heatLayer(points, {
      radius: 28,
      blur: 18,
      maxZoom: 19,
      max: 1.0,
      gradient: {
        0.2: "#10b981",
        0.5: "#f59e0b",
        0.75: "#f97316",
        1.0: "#ef4444",
      },
    });
    layer.addTo(map);
    return () => {
      layer.remove();
    };
  }, [map, points]);

  return null;
}

type LeafletIncidentesHeatmapProps = {
  items: IncidenteMapaItem[];
};

export function LeafletIncidentesHeatmap({ items }: LeafletIncidentesHeatmapProps) {
  const points: [number, number, number][] = items
    .filter((i) => i.latitud !== null && i.longitud !== null)
    .map((i) => [
      i.latitud!,
      i.longitud!,
      SEVERIDAD_WEIGHT[i.severidad ?? "BAJO"] ?? 0.2,
    ]);

  return (
    <MapContainer
      center={PUCP_CENTER}
      zoom={17}
      minZoom={15}
      maxZoom={19}
      maxBounds={PUCP_BOUNDS}
      maxBoundsViscosity={1.0}
      scrollWheelZoom={false}
      zoomControl={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <InvalidateSizeOnResize />
      <HeatLayer points={points} />
    </MapContainer>
  );
}
