import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Label, SectionHeader, colors, spacing } from "@safecampus/ui-native";

import type { AuthUser } from "../../shared/types/api";
import { BellIcon, LogoutIcon } from "../../shared/ui/icons";
import type { useOperatorData } from "./use-operator-data";

type OperatorData = ReturnType<typeof useOperatorData>;

export function ProfileScreen({
  data,
  logout,
  onOpenNotifications,
  user,
}: {
  data: OperatorData;
  logout: () => void;
  onOpenNotifications: () => void;
  user: AuthUser;
}) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Card style={styles.profile}>
        <View style={styles.avatar}>
          <Label size="xl" weight="900">
            {user.nombre.slice(0, 1)}
            {user.apellido.slice(0, 1)}
          </Label>
        </View>
        <View style={styles.profileText}>
          <Label size="lg" weight="900">{user.nombre} {user.apellido}</Label>
          <Label tone="muted">Operador de Seguridad</Label>
          <Label tone="info" size="sm">{user.codigo_institucional ?? user.email}</Label>
        </View>
      </Card>

      <View style={styles.stats}>
        <Metric label="Casos activos" value={data.activeIncidents.length} />
        <Metric label="Atencion" value={data.stats.en_atencion} />
        <Metric label="Resueltos 24h" value={data.stats.resueltos_24h} />
      </View>

      <SectionHeader title="Datos de turno" />
      <Card style={styles.info}>
        <Info label="Telefono" value={user.telefono ?? "No registrado"} />
        <Info label="Area" value={user.departamento ?? "Seguridad Campus"} />
        <Info label="Rol" value={user.roles.join(", ")} />
        <Info label="Canal radio" value="Canal 3 - Frecuencia A" />
        <Info label="Estado" value="En servicio" />
      </Card>

      <View style={styles.actions}>
        <Button variant="secondary" onPress={onOpenNotifications} style={styles.actionButton}>
          <BellIcon color={colors.text} size={20} />
          <Label weight="900">Notificaciones</Label>
        </Button>
        <Button variant="danger" onPress={logout} style={styles.actionButton}>
          <LogoutIcon color={colors.text} size={20} />
          <Label weight="900">Finalizar turno</Label>
        </Button>
      </View>
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card style={styles.metric}>
      <Label size="xl" weight="900" tone="warning">{value}</Label>
      <Label size="xs" tone="muted">{label}</Label>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Label size="xs" tone="muted" weight="800">{label}</Label>
      <Label size="sm">{value}</Label>
    </View>
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
  profile: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.lg,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.primaryMuted,
    borderRadius: 18,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  profileText: {
    flex: 1,
    gap: spacing.xs,
  },
  stats: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  metric: {
    flex: 1,
    padding: spacing.md,
  },
  info: {
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actions: {
    gap: spacing.sm,
  },
  actionButton: {
    justifyContent: "flex-start",
  },
});
