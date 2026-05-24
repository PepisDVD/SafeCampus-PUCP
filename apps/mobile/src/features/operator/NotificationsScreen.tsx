import { ScrollView, StyleSheet, View } from "react-native";
import { Badge, Card, Label, SectionHeader, colors, spacing } from "@safecampus/ui-native";

import type { useOperatorData } from "./use-operator-data";

type OperatorData = ReturnType<typeof useOperatorData>;

export function NotificationsScreen({ data }: { data: OperatorData }) {
  const notifications = [
    {
      id: "sync",
      title: "Realtime operativo",
      body: data.lastSyncAt
        ? `Ultima sincronizacion ${data.lastSyncAt.toLocaleTimeString("es-PE")}`
        : "Esperando primera sincronizacion",
      tone: "info" as const,
    },
    {
      id: "critical",
      title: "Alertas criticas",
      body: `${data.stats.criticos} incidente(s) criticos activos.`,
      tone: data.stats.criticos > 0 ? ("danger" as const) : ("success" as const),
    },
    {
      id: "push",
      title: "Push notifications",
      body: "Preparado para Expo Notifications cuando se habilite el registro de token de dispositivo.",
      tone: "warning" as const,
    },
  ];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View>
        <Label size="xl" weight="900">Notificaciones</Label>
        <Label tone="muted">Eventos operativos, alertas y estado de sincronizacion</Label>
      </View>
      <SectionHeader title="Centro de eventos" />
      {notifications.map((item) => (
        <Card key={item.id} style={styles.item}>
          <Badge tone={item.tone}>{item.title}</Badge>
          <Label>{item.body}</Label>
        </Card>
      ))}
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
  item: {
    gap: spacing.md,
  },
});
