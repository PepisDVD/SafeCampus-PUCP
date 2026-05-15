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
    const immediate = window.setTimeout(() => map.invalidateSize(), 0);
    const delayed = window.setTimeout(() => map.invalidateSize(), 180);

    return () => {
      window.clearTimeout(immediate);
      window.clearTimeout(delayed);
    };
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
            maxNativeZoom={19}
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
