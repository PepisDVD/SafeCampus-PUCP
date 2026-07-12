import { useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { Badge, Button, Card, Label, SectionHeader, colors, spacing } from "@safecampus/ui-native";

import { IncidentCard } from "./IncidentCard";
import { LeafletMap, type LeafletMapHandle, type LeafletMarker } from "./LeafletMap";
import { severityTone } from "./operator-format";
import { useOperatorLocation } from "./use-operator-location";
import type { useOperatorData } from "./use-operator-data";

type OperatorData = ReturnType<typeof useOperatorData>;

const FALLBACK_CENTER = {
  latitude: -12.06861,
  longitude: -77.07972,
};

const PIN_COLORS: Record<string, string> = {
  danger: colors.danger,
  warning: colors.warning,
  info: colors.info,
  success: colors.success,
};

export function MapScreen({ data }: { data: OperatorData }) {
  const location = useOperatorLocation();
  const mapRef = useRef<LeafletMapHandle | null>(null);

  const geocoded = data.activeIncidents.filter(
    (item) => item.latitud !== null && item.latitud !== undefined && item.longitud !== null && item.longitud !== undefined,
  );

  const mapCenter = useMemo(() => location.coords ?? FALLBACK_CENTER, [location.coords]);

  const markers = useMemo<LeafletMarker[]>(
    () =>
      geocoded.map((incident) => ({
        id: incident.id,
        coordinate: {
          latitude: incident.latitud as number,
          longitude: incident.longitud as number,
        },
        title: incident.titulo,
        description: incident.lugar_referencia ?? incident.codigo,
        color: PIN_COLORS[severityTone(incident.severidad)] ?? colors.info,
      })),
    [geocoded],
  );

  const openIncidentFromMarker = (markerId: string) => {
    const incident = geocoded.find((item) => item.id === markerId);
    if (incident) data.openIncident(incident);
  };

  const centerOnMe = () => {
    if (!location.coords) return;
    mapRef.current?.centerOn(location.coords, 17);
  };

  useEffect(() => {
    if (!location.coords) return;
    mapRef.current?.centerOn(location.coords, 17);
  }, [location.coords]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View>
        <Label size="xl" weight="900">Mapa tactico</Label>
        <Label tone="muted">{geocoded.length} incidentes con coordenadas</Label>
      </View>

      {location.permission === "granted" ? (
        <Card style={styles.map}>
          <LeafletMap
            ref={mapRef}
            center={mapCenter}
            markers={markers}
            onMarkerPress={openIncidentFromMarker}
            operatorLocation={location.coords}
            zoom={location.coords ? 17 : 15}
          />
          {location.loading && !location.coords ? (
            <View style={styles.mapLoading}>
              <ActivityIndicator color={colors.primary} />
              <Label tone="muted" size="sm">Obteniendo ubicacion...</Label>
            </View>
          ) : null}
          {location.error ? (
            <View style={styles.mapError}>
              <Label size="xs" tone="danger">{location.error}</Label>
            </View>
          ) : null}
          <View style={styles.mapActions}>
            <Button variant="primary" onPress={centerOnMe} style={styles.locateButton}>
              <Label size="xs" weight="800">Mi ubicacion</Label>
            </Button>
          </View>
        </Card>
      ) : (
        <Card style={styles.permissionCard}>
          <Label weight="800">Ubicacion desactivada</Label>
          <Label tone="muted" size="sm">
            {location.permission === "blocked"
              ? "El permiso de ubicacion esta bloqueado. Habilitalo desde los ajustes del sistema."
              : "Necesitamos tu ubicacion para mostrarte el mapa y los incidentes cercanos."}
          </Label>
          {location.permission === "blocked" ? (
            <Button variant="primary" onPress={() => void location.openSettings()}>
              <Label size="sm" weight="800">Abrir ajustes</Label>
            </Button>
          ) : (
            <Button variant="primary" onPress={() => void location.request()}>
              <Label size="sm" weight="800">Permitir ubicacion</Label>
            </Button>
          )}
        </Card>
      )}

      <View style={styles.legend}>
        <Badge tone="danger">Critico</Badge>
        <Badge tone="warning">Alto</Badge>
        <Badge tone="info">Medio</Badge>
        <Badge tone="success">Bajo</Badge>
      </View>

      <SectionHeader title="Incidentes cercanos" />
      <View style={styles.list}>
        {data.activeIncidents.slice(0, 6).map((incident) => (
          <IncidentCard
            key={incident.id}
            incident={incident}
            onPress={() => data.openIncident(incident)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  map: {
    height: 330,
    overflow: "hidden",
    padding: 0,
    position: "relative",
  },
  mapActions: {
    bottom: spacing.sm,
    position: "absolute",
    right: spacing.sm,
  },
  mapError: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    left: spacing.sm,
    padding: spacing.sm,
    position: "absolute",
    right: spacing.sm,
    top: spacing.sm,
  },
  mapLoading: {
    alignItems: "center",
    backgroundColor: colors.surface,
    bottom: 0,
    gap: spacing.sm,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  locateButton: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
  },
  permissionCard: {
    gap: spacing.sm,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
});
