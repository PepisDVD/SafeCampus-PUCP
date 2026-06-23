"use client";

import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { cn } from "@safecampus/ui-kit";

type ReadonlyLocationMapProps = {
  lat: number;
  lng: number;
  className?: string;
  interactive?: boolean;
  markerColor?: string;
};

export function ReadonlyLocationMap({
  lat,
  lng,
  className,
  interactive = false,
  markerColor = "#001C55",
}: ReadonlyLocationMapProps) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={18}
      minZoom={15}
      maxZoom={19}
      dragging={interactive}
      doubleClickZoom={interactive}
      touchZoom
      scrollWheelZoom={interactive}
      className={cn("isolate h-full min-h-72 w-full", className)}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxNativeZoom={19}
      />
      <CircleMarker
        center={[lat, lng]}
        radius={11}
        pathOptions={{
          color: "#ffffff",
          fillColor: markerColor,
          fillOpacity: 0.95,
          opacity: 1,
          weight: 3,
        }}
      />
    </MapContainer>
  );
}
