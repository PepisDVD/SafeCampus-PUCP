import { useMemo, useRef } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import { Badge, Button, Card, Label, SectionHeader, colors, spacing } from "@safecampus/ui-native";

import { IncidentCard } from "./IncidentCard";
import { severityTone } from "./operator-format";
import { useOperatorLocation } from "./use-operator-location";
import type { useOperatorData } from "./use-operator-data";

type OperatorData = ReturnType<typeof useOperatorData>;

/** Centro por defecto (PUCP, Lima) cuando aún no hay lectura de GPS. */
const FALLBACK_REGION: Region = {
  latitude: -12.06861,
  longitude: -77.07972,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

const PIN_COLORS: Record<string, string> = {
  danger: colors.danger,
  warning: colors.warning,
  info: colors.info,
  success: colors.success,
};

export function MapScreen({ data }: { data: OperatorData }) {
  const location = useOperatorLocation();
  const mapRef = useRef<MapView | null>(null);

  const geocoded = data.activeIncidents.filter(
    (item) => item.latitud !== null && item.latitud !== undefined && item.longitud !== null && item.longitud !== undefined,
  );

  const initialRegion = useMemo<Region>(() => {
    if (location.coords) {
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    return FALLBACK_REGION;
  }, [location.coords]);

  const centerOnMe = () => {
    if (!location.coords) return;
    mapRef.current?.animateToRegion(
      {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500,
    );
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View>
        <Label size="xl" weight="900">Mapa tactico</Label>
        <Label tone="muted">{geocoded.length} incidentes con coordenadas</Label>
      </View>

      {location.permission === "granted" ? (
        <Card style={styles.map}>
          {location.loading && !location.coords ? (
            <View style={styles.mapLoading}>
              <ActivityIndicator color={colors.primary} />
              <Label tone="muted" size="sm">Obteniendo ubicacion...</Label>
            </View>
          ) : (
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFill}
              initialRegion={initialRegion}
              showsUserLocation={Boolean(location.coords)}
              showsMyLocationButton={false}
              showsCompass
            >
              {geocoded.map((incident) => (
                <Marker
                  key={incident.id}
                  coordinate={{ latitude: incident.latitud as number, longitude: incident.longitud as number }}
                  title={incident.titulo}
                  description={incident.lugar_referencia ?? incident.codigo}
                  pinColor={PIN_COLORS[severityTone(incident.severidad)] ?? colors.info}
                  onCalloutPress={() => data.openIncident(incident)}
                />
              ))}
            </MapView>
          )}
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
    flex: 1,
    gap: spacing.sm,
    justifyContent: "center",
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
