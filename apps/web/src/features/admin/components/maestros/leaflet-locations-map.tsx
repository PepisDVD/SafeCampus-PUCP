"use client";

/**
 * 📁 leaflet-locations-map.tsx
 * 🎯 Mapa GENERAL del maestro de Ubicaciones: muestra todas las ubicaciones
 *    visibles (según búsqueda/filtros) para validar espacialmente el catálogo
 *    (cobertura, duplicados, puntos fuera de campus).
 *
 *    Usa react-leaflet-cluster (MarkerClusterGroup) para agrupar automáticamente
 *    los puntos cercanos; cuando no hay cercanía, los marcadores se ven sueltos.
 *
 * ⚠️ No confundir con `leaflet-coordinate-picker.tsx`, que sirve para elegir
 *    las coordenadas de UNA sola ubicación al crear/editar.
 */

import { useEffect, useRef } from "react";
import {
  divIcon,
  latLngBounds,
  type DivIcon,
  type Marker as LeafletMarker,
  type MarkerClusterGroup as LeafletMarkerClusterGroup,
} from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import type { UbicacionMaestra } from "@safecampus/shared-types";

import { formatTipoUbicacion } from "@/features/admin/constants/ubicacion-tipos";

type Props = {
  items: UbicacionMaestra[];
  selectedId?: string | null;
  onEdit: (item: UbicacionMaestra) => void;
  mapClassName?: string;
};

const DEFAULT_CENTER: [number, number] = [-12.06945, -77.08055];

/** Construye un marcador tipo "punto" según estado / selección (sin assets). */
function buildIcon(activa: boolean, selected: boolean): DivIcon {
  const size = selected ? 22 : 18;
  const bg = "#001C55";
  const border = selected ? "#f59e0b" : "#ffffff";
  const borderWidth = selected ? 3 : 2;
  const opacity = activa ? 1 : 0.55;
  return divIcon({
    className: "",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${
      activa ? bg : "#94a3b8"
    };border:${borderWidth}px solid ${border};box-shadow:0 0 0 1px rgba(15,23,42,.25);opacity:${opacity}"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

/** Ajusta el encuadre del mapa a las ubicaciones visibles (sin selección). */
function FitToLocations({
  items,
  hasSelection,
}: {
  items: UbicacionMaestra[];
  hasSelection: boolean;
}) {
  const map = useMap();

  // El mapa se monta dentro de una tarjeta; recalcula su tamaño al aparecer
  // (varias pasadas para evitar tiles grises mientras se estabiliza el layout).
  useEffect(() => {
    const timers = [0, 180, 400, 800].map((delay) =>
      window.setTimeout(() => map.invalidateSize(), delay),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [map]);

  useEffect(() => {
    // El centrado de la ubicación seleccionada lo maneja el clúster.
    if (hasSelection || items.length === 0) return;

    if (items.length === 1) {
      map.setView([items[0]!.latitud, items[0]!.longitud], 17);
      return;
    }

    const bounds = latLngBounds(
      items.map((item) => [item.latitud, item.longitud] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 18 });
  }, [items, hasSelection, map]);

  return null;
}

export function LeafletLocationsMap({
  items,
  selectedId,
  onEdit,
  mapClassName = "h-[78vh] min-h-130",
}: Props) {
  const markerRefs = useRef(new Map<string, LeafletMarker>());
  const clusterRef = useRef<LeafletMarkerClusterGroup | null>(null);

  // Al resaltar una ubicación desde la lista: expandir su clúster, centrar y
  // abrir su popup cuando sea posible.
  useEffect(() => {
    if (!selectedId) return;
    const marker = markerRefs.current.get(selectedId);
    if (!marker) return;
    const cluster = clusterRef.current;
    if (cluster && typeof cluster.zoomToShowLayer === "function") {
      cluster.zoomToShowLayer(marker, () => marker.openPopup());
    } else {
      marker.openPopup();
    }
  }, [selectedId, items]);

  return (
    // `isolate` crea un stacking context propio para que los z-index internos
    // de Leaflet (controles, popups) no se superpongan a overlays como el Drawer.
    <div className={`relative isolate ${mapClassName}`}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={16}
        minZoom={13}
        maxZoom={19}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          maxNativeZoom={19}
          keepBuffer={6}
          updateWhenZooming={false}
        />
        <FitToLocations items={items} hasSelection={Boolean(selectedId)} />
        <MarkerClusterGroup
          ref={clusterRef}
          chunkedLoading
          showCoverageOnHover={false}
          spiderfyOnMaxZoom
        >
          {items.map((item) => (
            <Marker
              key={item.id}
              position={[item.latitud, item.longitud]}
              icon={buildIcon(item.activa, item.id === selectedId)}
              ref={(instance) => {
                if (instance) markerRefs.current.set(item.id, instance);
                else markerRefs.current.delete(item.id);
              }}
            >
              <Popup>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-900">{item.nombre}</p>
                  <div className="space-y-0.5 text-xs text-slate-600">
                    <p>
                      <span className="text-slate-400">Código:</span> {item.codigo}
                    </p>
                    <p>
                      <span className="text-slate-400">Tipo:</span>{" "}
                      {formatTipoUbicacion(item.tipo)}
                    </p>
                    <p>
                      <span className="text-slate-400">Estado:</span>{" "}
                      {item.activa ? "Activa" : "Inactiva"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="mt-1 inline-flex w-full items-center justify-center rounded-md bg-[#001C55] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#001C55]/90"
                  >
                    Editar ubicación
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {items.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-500 flex items-center justify-center">
          <p className="rounded-md bg-white/90 px-4 py-2 text-sm text-slate-500 shadow-sm">
            No hay ubicaciones para los filtros seleccionados.
          </p>
        </div>
      )}
    </div>
  );
}
