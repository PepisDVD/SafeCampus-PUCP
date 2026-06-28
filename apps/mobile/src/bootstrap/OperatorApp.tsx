import React from "react";
import { ActivityIndicator, PanResponder, Platform, StatusBar, StyleSheet, View } from "react-native";
import { Button, Label, colors, spacing } from "@safecampus/ui-native";

import { getLostFoundAccess } from "../shared/api/client";
import { logger } from "../shared/fallback/logger";
import { HomeIcon, MapIcon, PackageIcon, ShieldIcon, UserIcon } from "../shared/ui/icons";
import { LoginScreen } from "../features/auth/LoginScreen";
import { useAuth } from "../features/auth/auth-context";
import { DashboardScreen } from "../features/operator/DashboardScreen";
import { IncidentsScreen } from "../features/operator/IncidentsScreen";
import { LostFoundScreen } from "../features/operator/LostFoundScreen";
import { MapScreen } from "../features/operator/MapScreen";
import { NotificationsScreen } from "../features/operator/NotificationsScreen";
import { ProfileScreen } from "../features/operator/ProfileScreen";
import { useIncidentAssignmentNotifications } from "../features/operator/use-incident-notifications";
import { useOperatorData } from "../features/operator/use-operator-data";
import { useNetworkStatus } from "../shared/net/use-network-status";

type Tab = "inicio" | "incidentes" | "mapa" | "lost-found" | "alertas" | "perfil";

const TAB_ITEMS: Array<{ value: Exclude<Tab, "alertas">; label: string; icon: (props: { color: string; size?: number }) => React.ReactNode; requiresLostFound?: boolean }> = [
  { value: "inicio", label: "Inicio", icon: HomeIcon },
  { value: "incidentes", label: "Incidentes", icon: ShieldIcon },
  { value: "mapa", label: "Mapa", icon: MapIcon },
  { value: "lost-found", label: "Lost & Found", icon: PackageIcon, requiresLostFound: true },
  { value: "perfil", label: "Perfil", icon: UserIcon },
];

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
  const [lostFoundAccess, setLostFoundAccess] = React.useState(false);
  const [lostFoundVisited, setLostFoundVisited] = React.useState(false);
  const mainTabs = React.useMemo(
    () => TAB_ITEMS.filter((item) => !item.requiresLostFound || lostFoundAccess).map((item) => item.value),
    [lostFoundAccess],
  );

  useIncidentAssignmentNotifications(data.activeIncidents, data.lastSyncAt !== null);

  React.useEffect(() => {
    if (!auth.token || auth.token === "demo-token") {
      setLostFoundAccess(false);
      return;
    }
    let active = true;
    getLostFoundAccess(auth.token)
      .then((result) => active && setLostFoundAccess(result.acceso))
      .catch((error) => {
        logger.error("lost-found-mobile/access", error);
        if (active) setLostFoundAccess(false);
      });
    return () => {
      active = false;
    };
  }, [auth.token]);

  React.useEffect(() => {
    if (tab === "lost-found" && !lostFoundAccess) setTab("inicio");
    if (!lostFoundAccess) setLostFoundVisited(false);
  }, [lostFoundAccess, tab]);

  React.useEffect(() => {
    if (tab === "lost-found") setLostFoundVisited(true);
  }, [tab]);

  const panResponder = React.useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => (
        Math.abs(gesture.dx) > 32 &&
        Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4
      ),
      onPanResponderRelease: (_, gesture) => {
        if (Math.abs(gesture.dx) < 80) return;
        const activeTab = tab === "alertas" ? "perfil" : tab;
        const index = mainTabs.indexOf(activeTab as Exclude<Tab, "alertas">);
        if (index < 0) return;
        const nextIndex = gesture.dx < 0 ? index + 1 : index - 1;
        const nextTab = mainTabs[nextIndex];
        if (nextTab) setTab(nextTab);
      },
    }),
    [mainTabs, tab],
  );

  if (!auth.user) return null;

  return (
    <View style={styles.safe} onTouchStart={auth.notifyActivity}>
      <StatusBar barStyle="light-content" />
      {!isOnline ? (
        <View style={styles.offlineBanner}>
          <Label size="xs" weight="800">
            Sin conexión · trabajando con los últimos datos disponibles
          </Label>
        </View>
      ) : null}
      <View style={styles.body} {...panResponder.panHandlers}>
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
        {lostFoundAccess && lostFoundVisited && auth.token ? (
          <View style={[styles.screenLayer, tab !== "lost-found" && styles.hiddenScreen]}>
            <LostFoundScreen active={tab === "lost-found"} token={auth.token} />
          </View>
        ) : null}
        {tab === "alertas" ? <NotificationsScreen data={data} /> : null}
        {tab === "perfil" ? (
          <ProfileScreen data={data} logout={auth.logout} onOpenNotifications={() => setTab("alertas")} user={auth.user} />
        ) : null}
      </View>
      <View style={styles.tabs}>
        {TAB_ITEMS.filter((item) => !item.requiresLostFound || lostFoundAccess).map((item) => {
          const active = tab === item.value;
          const Icon = item.icon;
          return (
          <Button
            key={item.value}
            accessibilityHint={`Cambiar a ${item.label}`}
            accessibilityLabel={item.label}
            variant={active ? "primary" : "ghost"}
            onPress={() => setTab(item.value)}
            style={styles.tabButton}
          >
            <Icon color={active ? colors.text : colors.textMuted} size={24} />
          </Button>
          );
        })}
      </View>
    </View>
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
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0,
  },
  offlineBanner: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  body: {
    flex: 1,
  },
  hiddenScreen: {
    display: "none",
  },
  screenLayer: {
    flex: 1,
  },
  tabs: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingBottom: Platform.OS === "android" ? spacing.xxl : spacing.lg,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  tabButton: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
});
