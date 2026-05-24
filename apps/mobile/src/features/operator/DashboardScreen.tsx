import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Badge, Button, Card, Label, SectionHeader, colors, spacing } from "@safecampus/ui-native";

import type { AuthUser } from "../../shared/types/api";
import { IncidentCard } from "./IncidentCard";
import type { useOperatorData } from "./use-operator-data";

type OperatorData = ReturnType<typeof useOperatorData>;

export function DashboardScreen({
  data,
  user,
  goIncidents,
  goMap,
}: {
  data: OperatorData;
  user: AuthUser;
  goIncidents: () => void;
  goMap: () => void;
}) {
  const criticals = data.activeIncidents.filter((item) => item.severidad === "CRITICO");

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={data.loading} onRefresh={data.refresh} />}
      style={styles.root}
      contentContainerStyle={styles.content}
    >
      <Card style={styles.shiftCard}>
        <View>
          <Label size="xs" tone="muted" weight="800">EN SERVICIO</Label>
          <Label size="lg" weight="900">{user.nombre} {user.apellido}</Label>
          <Label size="sm" tone="muted">{user.codigo_institucional ?? "Operador"} - Turno activo</Label>
        </View>
        <Badge tone="success">Online</Badge>
      </Card>

      {criticals.map((incident) => (
        <Card key={incident.id} style={styles.alertCard}>
          <Label tone="danger" weight="900">Alerta critica</Label>
          <Label weight="800">{incident.titulo}</Label>
          <Label tone="muted" size="sm">{incident.lugar_referencia}</Label>
          <Button variant="danger" onPress={() => data.openIncident(incident)}>
            <Label weight="900">Atender ahora</Label>
          </Button>
        </Card>
      ))}

      <View style={styles.statsGrid}>
        <Stat label="Activos" value={data.stats.activos} />
        <Stat label="Criticos" value={data.stats.criticos} tone="danger" />
        <Stat label="En atencion" value={data.stats.en_atencion} tone="warning" />
        <Stat label="Resueltos 24h" value={data.stats.resueltos_24h} tone="success" />
      </View>

      <SectionHeader
        title="Casos activos"
        action={
          <Button variant="ghost" onPress={goIncidents} style={styles.linkButton}>
            <Label size="xs" tone="info" weight="800">Ver todos</Label>
          </Button>
        }
      />
      <View style={styles.list}>
        {data.activeIncidents.slice(0, 4).map((incident) => (
          <IncidentCard
            key={incident.id}
            incident={incident}
            onPress={() => data.openIncident(incident)}
          />
        ))}
      </View>

      <SectionHeader title="Acciones rapidas" />
      <View style={styles.actions}>
        <Button onPress={goIncidents} style={styles.actionButton}>
          <Label weight="900">Nuevo caso</Label>
        </Button>
        <Button variant="secondary" onPress={goMap} style={styles.actionButton}>
          <Label weight="900">Mapa tactico</Label>
        </Button>
        <Button variant="danger" style={styles.fullAction}>
          <Label weight="900">Activar emergencia</Label>
        </Button>
      </View>
    </ScrollView>
  );
}

function Stat({
  label,
  value,
  tone = "info",
}: {
  label: string;
  value: number;
  tone?: "danger" | "warning" | "success" | "info";
}) {
  return (
    <Card style={styles.statCard}>
      <Label size="xl" weight="900" tone={tone}>{value}</Label>
      <Label size="xs" tone="muted">{label}</Label>
    </Card>
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
  shiftCard: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  alertCard: {
    borderColor: colors.danger,
    gap: spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statCard: {
    flexBasis: "48%",
    flexGrow: 1,
    padding: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  linkButton: {
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  fullAction: {
    width: "100%",
  },
});
