"use client";

import { useEffect, useMemo } from "react";
import type { LatLngExpression } from "leaflet";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";

type Props = {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  mapClassName?: string;
  showHelperText?: boolean;
};

const DEFAULT_CENTER: [number, number] = [-12.06945, -77.08055];

function ClickCapture({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (event) => {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function SyncView({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();

  useEffect(() => {
    // Varias pasadas: el mapa vive dentro de un Dialog animado y debe
    // recalcular su tamaño cuando el contenedor termina de estabilizarse.
    const timers = [0, 180, 400, 800].map((delay) =>
      window.setTimeout(() => map.invalidateSize(), delay),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [map]);

  useEffect(() => {
    if (lat === null || lng === null) return;
    map.setView([lat, lng], Math.max(map.getZoom(), 17));
  }, [lat, lng, map]);

  return null;
}

export function LeafletCoordinatePicker({
  lat,
  lng,
  onChange,
  mapClassName = "h-64",
  showHelperText = true,
}: Props) {
  const center = useMemo<LatLngExpression>(() => {
    if (lat === null || lng === null) {
      return DEFAULT_CENTER;
    }
    return [lat, lng];
  }, [lat, lng]);

  return (
    <div className="space-y-2">
      <div className={`overflow-hidden rounded-lg border ${mapClassName}`}>
        <MapContainer center={center} zoom={17} minZoom={15} maxZoom={19} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            maxNativeZoom={19}
            keepBuffer={6}
            updateWhenZooming={false}
          />
          <SyncView lat={lat} lng={lng} />
          <ClickCapture onPick={onChange} />
          {lat !== null && lng !== null && (
            <CircleMarker
              center={[lat, lng]}
              radius={9}
              pathOptions={{
                color: "#ffffff",
                fillColor: "#001C55",
                fillOpacity: 0.95,
                opacity: 1,
                weight: 2,
              }}
            />
          )}
        </MapContainer>
      </div>
      {showHelperText && (
        <p className="text-xs text-slate-500">
          Haz clic en el mapa para actualizar latitud y longitud.
        </p>
      )}
    </div>
  );
}
