"use client";

import { useEffect } from "react";
import { latLng } from "leaflet";
import { Circle, CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export type PickedPoint = { lat: number; lng: number };

const PUCP_CENTER: [number, number] = [-12.06945, -77.08055];

function ClickCapture({ onPick }: { onPick: (point: PickedPoint) => void }) {
  useMapEvents({
    click(event) {
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

/**
 * Mantiene el mapa con el tamaño correcto: Leaflet renderiza gris cuando se monta
 * en un contenedor que aún no tiene dimensiones (caso típico dentro de un Drawer
 * animado). Recalcula al montar y ante cualquier cambio de tamaño del contenedor.
 */
function KeepSized() {
  const map = useMap();
  useEffect(() => {
    const invalidate = () => map.invalidateSize();
    const timers = [60, 220, 450, 800].map((delay) => window.setTimeout(invalidate, delay));
    const observer = new ResizeObserver(invalidate);
    observer.observe(map.getContainer());
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      observer.disconnect();
    };
  }, [map]);
  return null;
}

/** Encuadra el mapa al círculo seleccionado para que el rango quede a la vista. */
function FitToPoint({ point, radiusKm }: { point: PickedPoint | null; radiusKm: number }) {
  const map = useMap();
  useEffect(() => {
    if (!point) return;
    const bounds = latLng(point.lat, point.lng).toBounds(radiusKm * 1000 * 2.4);
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 18, animate: true });
    // Solo al elegir un punto nuevo; ajustar el radio no reencuadra para no marear.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [point?.lat, point?.lng]);
  return null;
}

type Props = {
  point: PickedPoint | null;
  radiusKm: number;
  onPick: (point: PickedPoint) => void;
};

export default function LocationPickerMap({ point, radiusKm, onPick }: Props) {
  const center: [number, number] = point ? [point.lat, point.lng] : PUCP_CENTER;
  return (
    <MapContainer center={center} zoom={16} minZoom={13} maxZoom={19} className="isolate h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
        maxNativeZoom={19}
      />
      <KeepSized />
      <ClickCapture onPick={onPick} />
      <FitToPoint point={point} radiusKm={radiusKm} />
      {point && (
        <>
          <Circle
            center={[point.lat, point.lng]}
            radius={radiusKm * 1000}
            pathOptions={{
              color: "#001C55",
              weight: 2,
              opacity: 0.9,
              fillColor: "#2563eb",
              fillOpacity: 0.18,
              dashArray: "6 6",
            }}
          />
          <CircleMarker
            center={[point.lat, point.lng]}
            radius={8}
            pathOptions={{ color: "#ffffff", fillColor: "#001C55", fillOpacity: 1, opacity: 1, weight: 3 }}
          />
        </>
      )}
    </MapContainer>
  );
}
