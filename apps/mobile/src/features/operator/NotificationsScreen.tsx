import { ScrollView, StyleSheet, View } from "react-native";
import { Badge, Button, Card, Label, SectionHeader, colors, spacing } from "@safecampus/ui-native";
import { formatLimaDateTime } from "@safecampus/shared-types";

import { useNotificationPermission } from "../permissions";
import type { useOperatorData } from "./use-operator-data";

type OperatorData = ReturnType<typeof useOperatorData>;

export function NotificationsScreen({ data }: { data: OperatorData }) {
  const push = useNotificationPermission();

  const pushCopy =
    push.state === "granted"
      ? "Activas. Te avisaremos cuando se te asigne un nuevo incidente."
      : push.state === "blocked"
        ? "Bloqueadas. Habilitalas desde los ajustes del sistema para recibir avisos."
        : "Desactivadas. Activalas para recibir un aviso cuando se te asigne un incidente.";

  const notifications = [
    {
      id: "sync",
      title: "Realtime operativo",
      body: data.lastSyncAt
        ? `Ultima sincronizacion ${formatLimaDateTime(data.lastSyncAt, {
            hour: "2-digit",
            minute: "2-digit",
          }, "--:--")}`
        : "Esperando primera sincronizacion",
      tone: "info" as const,
    },
    {
      id: "critical",
      title: "Alertas criticas",
      body: `${data.stats.criticos} incidente(s) criticos activos.`,
      tone: data.stats.criticos > 0 ? ("danger" as const) : ("success" as const),
    },
  ];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View>
        <Label size="xl" weight="900">Notificaciones</Label>
        <Label tone="muted">Eventos operativos, alertas y estado de sincronizacion</Label>
      </View>

      <SectionHeader title="Avisos de asignacion" />
      <Card style={styles.item}>
        <Badge tone={push.state === "granted" ? "success" : "warning"}>
          {push.state === "granted" ? "Activas" : "Inactivas"}
        </Badge>
        <Label>{pushCopy}</Label>
        {push.state !== "granted" ? (
          <Button
            variant="primary"
            onPress={() =>
              push.state === "blocked" ? void push.openSettings() : void push.request()
            }
          >
            <Label size="sm" weight="800">
              {push.state === "blocked" ? "Abrir ajustes" : "Activar notificaciones"}
            </Label>
          </Button>
        ) : null}
      </Card>

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
