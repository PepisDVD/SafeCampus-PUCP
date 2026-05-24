import { ScrollView, StyleSheet, View } from "react-native";
import { Badge, Card, Label, SectionHeader, colors, spacing } from "@safecampus/ui-native";

import { IncidentCard } from "./IncidentCard";
import { severityTone } from "./operator-format";
import type { useOperatorData } from "./use-operator-data";

type OperatorData = ReturnType<typeof useOperatorData>;

export function MapScreen({ data }: { data: OperatorData }) {
  const geocoded = data.activeIncidents.filter(
    (item) => item.latitud !== null && item.latitud !== undefined && item.longitud !== null && item.longitud !== undefined,
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View>
        <Label size="xl" weight="900">Mapa tactico</Label>
        <Label tone="muted">{geocoded.length} incidentes con coordenadas</Label>
      </View>

      <Card style={styles.map}>
        <View style={styles.mapGrid}>
          {geocoded.map((incident, index) => (
            <View
              key={incident.id}
              style={[
                styles.pin,
                styles[`pin_${severityTone(incident.severidad)}`],
                {
                  left: `${18 + ((index * 23) % 64)}%`,
                  top: `${18 + ((index * 31) % 56)}%`,
                },
              ]}
            >
              <Label size="xs" weight="900">!</Label>
            </View>
          ))}
          <View style={styles.location}>
            <View style={styles.locationDot} />
            <Label size="xs" tone="info" weight="800">Mi posicion</Label>
          </View>
        </View>
      </Card>

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
  },
  mapGrid: {
    backgroundColor: "#122033",
    flex: 1,
    position: "relative",
  },
  pin: {
    alignItems: "center",
    borderColor: colors.text,
    borderRadius: 999,
    borderWidth: 2,
    height: 28,
    justifyContent: "center",
    position: "absolute",
    width: 28,
  },
  pin_danger: {
    backgroundColor: colors.danger,
  },
  pin_warning: {
    backgroundColor: colors.warning,
  },
  pin_info: {
    backgroundColor: colors.info,
  },
  pin_success: {
    backgroundColor: colors.success,
  },
  location: {
    alignItems: "center",
    left: "47%",
    position: "absolute",
    top: "48%",
  },
  locationDot: {
    backgroundColor: colors.info,
    borderColor: colors.text,
    borderRadius: 999,
    borderWidth: 2,
    height: 18,
    width: 18,
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
