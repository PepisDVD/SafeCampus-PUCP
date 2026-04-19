import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>SafeCampus Operador</Text>
        <Text style={styles.subtitle}>
          Base mobile del monorepo lista para evolucionar con flujos operativos.
        </Text>
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f3f6ff",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 460,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderColor: "#dbe6ff",
    borderWidth: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#001C55",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#4d5b7b",
    lineHeight: 20,
  },
});
