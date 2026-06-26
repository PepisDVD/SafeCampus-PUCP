import React from "react";
import { ActivityIndicator, SafeAreaView, StatusBar, StyleSheet, View } from "react-native";
import { Button, Label, colors, spacing } from "@safecampus/ui-native";

import { LoginScreen } from "../features/auth/LoginScreen";
import { useAuth } from "../features/auth/auth-context";
import { DashboardScreen } from "../features/operator/DashboardScreen";
import { IncidentsScreen } from "../features/operator/IncidentsScreen";
import { MapScreen } from "../features/operator/MapScreen";
import { NotificationsScreen } from "../features/operator/NotificationsScreen";
import { ProfileScreen } from "../features/operator/ProfileScreen";
import { useIncidentAssignmentNotifications } from "../features/operator/use-incident-notifications";
import { useOperatorData } from "../features/operator/use-operator-data";
import { useNetworkStatus } from "../shared/net/use-network-status";

type Tab = "inicio" | "incidentes" | "mapa" | "alertas" | "perfil";

export function OperatorApp() {
  const auth = useAuth();

  if (auth.status === "UNKNOWN") {
    return (
      <View style={styles.splash}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (auth.status !== "AUTHENTICATED") {
    return <LoginScreen />;
  }

  return <AuthenticatedShell />;
}

function AuthenticatedShell() {
  const auth = useAuth();
  const data = useOperatorData(auth.token);
  const { isOnline } = useNetworkStatus();
  const [tab, setTab] = React.useState<Tab>("inicio");

  useIncidentAssignmentNotifications(data.activeIncidents, data.lastSyncAt !== null);

  if (!auth.user) return null;

  return (
    <SafeAreaView style={styles.safe} onTouchStart={auth.notifyActivity}>
      <StatusBar barStyle="light-content" />
      {!isOnline ? (
        <View style={styles.offlineBanner}>
          <Label size="xs" weight="800">
            Sin conexión · trabajando con los últimos datos disponibles
          </Label>
        </View>
      ) : null}
      <View style={styles.body}>
        {tab === "inicio" ? (
          <DashboardScreen
            data={data}
            user={auth.user}
            goIncidents={() => setTab("incidentes")}
            goMap={() => setTab("mapa")}
          />
        ) : null}
        {tab === "incidentes" ? <IncidentsScreen data={data} /> : null}
        {tab === "mapa" ? <MapScreen data={data} /> : null}
        {tab === "alertas" ? <NotificationsScreen data={data} /> : null}
        {tab === "perfil" ? (
          <ProfileScreen data={data} logout={auth.logout} user={auth.user} />
        ) : null}
      </View>
      <View style={styles.tabs}>
        {(["inicio", "incidentes", "mapa", "alertas", "perfil"] as Tab[]).map((item) => (
          <Button
            key={item}
            variant={tab === item ? "primary" : "ghost"}
            onPress={() => setTab(item)}
            style={styles.tabButton}
          >
            <Label size="xs" weight="800" tone={tab === item ? "default" : "muted"}>
              {item}
            </Label>
          </Button>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  splash: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
  },
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
  offlineBanner: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  body: {
    flex: 1,
  },
  tabs: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.sm,
  },
  tabButton: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
});
