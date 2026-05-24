import { Pressable, StyleSheet, View } from "react-native";
import { Badge, Card, Label, colors, spacing } from "@safecampus/ui-native";

import type { IncidentListItem } from "../../shared/types/api";
import { formatTime, severityLabel, severityTone, statusLabel } from "./operator-format";

export function IncidentCard({
  incident,
  onPress,
}: {
  incident: IncidentListItem;
  onPress: () => void;
}) {
  const tone = severityTone(incident.severidad);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Card style={styles.card}>
        <View style={[styles.marker, styles[`marker_${tone}`]]} />
        <View style={styles.body}>
          <View style={styles.row}>
            <Label size="xs" tone="muted" weight="800">
              {incident.codigo}
            </Label>
            <Badge tone={tone}>{incident.severidad ? severityLabel[incident.severidad] : "Sin severidad"}</Badge>
          </View>
          <Label weight="800" style={styles.title}>
            {incident.titulo}
          </Label>
          <View style={styles.row}>
            <Label size="xs" tone="muted">
              {incident.lugar_referencia ?? "Sin ubicacion"}
            </Label>
            <Label size="xs" tone="muted">
              {formatTime(incident.created_at)}
            </Label>
          </View>
          <Label size="xs" tone="info" weight="700">
            {statusLabel[incident.estado]}
          </Label>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
  },
  card: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  marker: {
    borderRadius: 999,
    height: 12,
    marginTop: 4,
    width: 12,
  },
  marker_danger: {
    backgroundColor: colors.danger,
  },
  marker_warning: {
    backgroundColor: colors.warning,
  },
  marker_info: {
    backgroundColor: colors.info,
  },
  marker_success: {
    backgroundColor: colors.success,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    lineHeight: 20,
  },
});
