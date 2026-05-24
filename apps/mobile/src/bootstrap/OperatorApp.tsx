import React from "react";
import { SafeAreaView, StatusBar, StyleSheet, View } from "react-native";
import { Button, Label, colors, spacing } from "@safecampus/ui-native";

import { LoginScreen } from "../features/auth/LoginScreen";
import { useAuth } from "../features/auth/auth-context";
import { DashboardScreen } from "../features/operator/DashboardScreen";
import { IncidentsScreen } from "../features/operator/IncidentsScreen";
import { MapScreen } from "../features/operator/MapScreen";
import { NotificationsScreen } from "../features/operator/NotificationsScreen";
import { ProfileScreen } from "../features/operator/ProfileScreen";
import { useOperatorData } from "../features/operator/use-operator-data";

type Tab = "inicio" | "incidentes" | "mapa" | "alertas" | "perfil";

export function OperatorApp() {
  const auth = useAuth();
  const data = useOperatorData(auth.token);
  const [tab, setTab] = React.useState<Tab>("inicio");

  if (!auth.user) {
    return <LoginScreen />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
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
  safe: {
    backgroundColor: colors.background,
    flex: 1,
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
