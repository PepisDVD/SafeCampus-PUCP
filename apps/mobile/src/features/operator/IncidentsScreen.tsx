import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Field, Label, SectionHeader, colors, spacing } from "@safecampus/ui-native";

import type { IncidentStatus } from "../../shared/types/api";
import { IncidentCard } from "./IncidentCard";
import { IncidentDetailScreen } from "./IncidentDetailScreen";
import type { useOperatorData } from "./use-operator-data";

type OperatorData = ReturnType<typeof useOperatorData>;

const statusFilters: Array<IncidentStatus | "TODOS"> = [
  "TODOS",
  "RECIBIDO",
  "EN_ATENCION",
  "EN_EVALUACION",
  "RESUELTO",
];

export function IncidentsScreen({ data }: { data: OperatorData }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<IncidentStatus | "TODOS">("TODOS");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.incidents.filter((incident) => {
      if (status !== "TODOS" && incident.estado !== status) return false;
      if (!term) return true;
      return `${incident.codigo} ${incident.titulo} ${incident.lugar_referencia ?? ""}`
        .toLowerCase()
        .includes(term);
    });
  }, [data.incidents, search, status]);

  if (data.selected) {
    return (
      <IncidentDetailScreen
        addNote={data.addNote}
        changeStatus={data.changeStatus}
        incident={data.selected}
        onBack={data.closeIncident}
      />
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View>
        <Label size="xl" weight="900">Incidentes</Label>
        <Label tone="muted">{filtered.length} casos encontrados</Label>
      </View>
      <Field placeholder="Buscar por codigo, titulo o zona" value={search} onChangeText={setSearch} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.filters}>
          {statusFilters.map((option) => (
            <Button
              key={option}
              variant={status === option ? "primary" : "secondary"}
              onPress={() => setStatus(option)}
              style={styles.filterButton}
            >
              <Label size="xs" weight="800">{option.replace("_", " ")}</Label>
            </Button>
          ))}
        </View>
      </ScrollView>

      <SectionHeader title="Listado operativo" />
      <View style={styles.list}>
        {filtered.map((incident) => (
          <IncidentCard
            key={incident.id}
            incident={incident}
            onPress={() => data.openIncident(incident)}
          />
        ))}
      </View>
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
  filters: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  filterButton: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
});
