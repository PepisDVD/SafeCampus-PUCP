import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Button, Card, Field, Label, colors, spacing } from "@safecampus/ui-native";

import { API_BASE_URL, CONFIG } from "../../shared/config/env";
import { useAuth } from "./auth-context";

export function LoginScreen() {
  const { continueAsDemoOperator, error, loading, loginWithOperatorEmail, status } = useAuth();
  const [email, setEmail] = useState("operador.seguridad@example.com");
  const [password, setPassword] = useState("");

  const openInstitutionalLogin = () => {
    const authBase = API_BASE_URL.replace(/\/api\/v1$/, "");
    void Linking.openURL(`${authBase}/api/v1/auth/google/login?email=${encodeURIComponent(email)}&next=/dashboard`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <Label size="xl" weight="800">
          SafeCampus Operador
        </Label>
        <Label tone="muted" style={styles.copy}>
          Consola movil para turnos de seguridad, incidentes activos, mapa tactico y alertas.
        </Label>
      </View>

      <Card style={styles.card}>
        <Label size="sm" weight="800" tone="muted" style={styles.section}>
          ACCESO OPERATIVO
        </Label>
        {status === "EXPIRED" ? (
          <Label tone="warning" size="sm">
            Tu sesión expiró por inactividad. Vuelve a ingresar.
          </Label>
        ) : null}
        <Field
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="correo del operador"
          value={email}
        />
        <Field
          onChangeText={setPassword}
          placeholder="contrasena"
          secureTextEntry
          value={password}
        />
        {error ? <Label tone="danger" size="sm">{error}</Label> : null}
        <Button loading={loading} onPress={() => loginWithOperatorEmail(email, password)}>
          <Label weight="800">Ingresar con email operativo</Label>
        </Button>
        <Button variant="secondary" onPress={openInstitutionalLogin}>
          <Label weight="800">Login institucional PUCP</Label>
        </Button>
      </Card>

      {CONFIG.ALLOW_DEMO_MODE ? (
        <Button variant="ghost" onPress={continueAsDemoOperator}>
          <Label tone="muted" weight="700">Continuar con datos demo</Label>
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  brand: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  copy: {
    lineHeight: 20,
  },
  card: {
    gap: spacing.md,
  },
  section: {
    letterSpacing: 0,
  },
});
