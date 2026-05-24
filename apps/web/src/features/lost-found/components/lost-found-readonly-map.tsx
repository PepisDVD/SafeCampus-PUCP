"use client";

import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";

type Props = {
  lat: number;
  lng: number;
};

export function LostFoundReadonlyMap({ lat, lng }: Props) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={18}
      minZoom={15}
      maxZoom={19}
      dragging={false}
      doubleClickZoom={false}
      touchZoom
      scrollWheelZoom
      className="h-full min-h-96 w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxNativeZoom={19}
      />
      <CircleMarker
        center={[lat, lng]}
        radius={10}
        pathOptions={{
          color: "#ffffff",
          fillColor: "#001C55",
          fillOpacity: 0.95,
          opacity: 1,
          weight: 3,
        }}
      />
    </MapContainer>
  );
}
