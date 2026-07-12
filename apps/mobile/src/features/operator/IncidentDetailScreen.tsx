import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Badge, Button, Card, Field, Label, SectionHeader, colors, spacing } from "@safecampus/ui-native";

import type { IncidentDetail, IncidentStatus } from "../../shared/types/api";
import { LeafletMap } from "./LeafletMap";
import { formatTime, severityLabel, severityTone, statusLabel } from "./operator-format";

export function IncidentDetailScreen({
  addNote,
  changeStatus,
  incident,
  onBack,
}: {
  addNote: (incidentId: string, note: string) => Promise<void>;
  changeStatus: (incidentId: string, status: IncidentStatus, note?: string) => Promise<void>;
  incident: IncidentDetail;
  onBack: () => void;
}) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const hasCoordinates =
    typeof incident.latitud === "number" && typeof incident.longitud === "number";
  const incidentCenter = hasCoordinates
    ? {
        latitude: incident.latitud as number,
        longitude: incident.longitud as number,
      }
    : null;
  const liveLocationIsFresh =
    incident.live_location_enabled &&
    (!incident.live_location_expires_at ||
      Date.parse(incident.live_location_expires_at) > Date.now());

  const saveNote = async () => {
    setSaving(true);
    try {
      await addNote(incident.id, note);
      setNote("");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (status: IncidentStatus) => {
    setSaving(true);
    try {
      await changeStatus(incident.id, status, `Actualizado desde app movil a ${status}.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Button variant="ghost" onPress={onBack} style={styles.backButton}>
        <Label tone="info" weight="800">Volver</Label>
      </Button>

      <Card style={styles.header}>
        <Label size="xs" tone="muted" weight="800">{incident.codigo}</Label>
        <Label size="lg" weight="900">{incident.titulo}</Label>
        <View style={styles.badges}>
          <Badge tone={severityTone(incident.severidad)}>
            {incident.severidad ? severityLabel[incident.severidad] : "Sin severidad"}
          </Badge>
          <Badge tone="info">{statusLabel[incident.estado]}</Badge>
          {liveLocationIsFresh ? (
            <Badge tone="success">Ubicacion en vivo</Badge>
          ) : null}
        </View>
      </Card>

      <Card style={styles.block}>
        <Info label="Ubicacion" value={incident.lugar_referencia ?? "Sin referencia"} />
        <Info
          label="Coordenadas"
          value={
            hasCoordinates
              ? `${(incident.latitud as number).toFixed(6)}, ${(incident.longitud as number).toFixed(6)}`
              : "No disponibles"
          }
        />
        <Info label="Categoria" value={incident.categoria ?? "Sin categoria"} />
        <Info label="Canal" value={incident.canal_origen} />
        <Info label="Reportante" value={incident.reportante?.nombre_completo ?? "No disponible"} />
        <Info label="Operador" value={incident.operador_asignado?.nombre_completo ?? "Sin asignar"} />
        <Info
          label="Ultima ubicacion"
          value={
            incident.live_location_updated_at
              ? formatTime(incident.live_location_updated_at)
              : "No registrada"
          }
        />
        <Info label="Hora" value={formatTime(incident.created_at)} />
      </Card>

      <SectionHeader title="Ubicacion del reportante" />
      {incidentCenter ? (
        <Card style={styles.mapCard}>
          <LeafletMap
            center={incidentCenter}
            interactive={false}
            markers={[
              {
                id: incident.id,
                coordinate: incidentCenter,
                title: incident.titulo,
                description: incident.lugar_referencia ?? incident.codigo,
                color: colors.danger,
              },
            ]}
            zoom={17}
          />
        </Card>
      ) : (
        <Card style={styles.emptyLocation}>
          <Label weight="800">Sin coordenadas</Label>
          <Label tone="muted" size="sm">
            Este reporte no incluye ubicacion GPS o zona georreferenciada.
          </Label>
        </Card>
      )}

      <Card>
        <Label size="xs" tone="muted" weight="800">DESCRIPCION</Label>
        <Label style={styles.description}>{incident.descripcion ?? "Sin descripcion registrada."}</Label>
      </Card>

      <SectionHeader title="Acciones de estado" />
      <View style={styles.actions}>
        <Button variant="secondary" loading={saving} onPress={() => setStatus("EN_ATENCION")}>
          <Label weight="800">En atencion</Label>
        </Button>
        <Button variant="secondary" loading={saving} onPress={() => setStatus("ESCALADO")}>
          <Label weight="800">Escalar</Label>
        </Button>
        <Button loading={saving} onPress={() => setStatus("RESUELTO")}>
          <Label weight="800">Resolver</Label>
        </Button>
      </View>

      <SectionHeader title="Nota operativa" />
      <Field
        multiline
        numberOfLines={4}
        onChangeText={setNote}
        placeholder="Registrar hallazgo, contacto o accion tomada"
        style={styles.note}
        value={note}
      />
      <Button loading={saving} onPress={saveNote}>
        <Label weight="900">Guardar nota</Label>
      </Button>

      <SectionHeader title={`Comunicacion (${incident.comentarios.length})`} />
      {incident.comentarios.length === 0 ? (
        <Label tone="muted" size="sm">Sin mensajes en este incidente.</Label>
      ) : (
        incident.comentarios.map((comment) => (
          <Card key={comment.id} style={styles.timelineItem}>
            <View style={styles.commentHeader}>
              <Label weight="800" size="sm">
                {comment.autor?.nombre_completo ?? "Sistema"}
              </Label>
              <Badge tone={comment.es_interno ? "warning" : "info"}>
                {comment.es_interno ? "Interno" : "Publico"}
              </Badge>
            </View>
            <Label tone="muted" size="xs">{formatTime(comment.created_at)}</Label>
            <Label size="sm">{comment.contenido}</Label>
          </Card>
        ))
      )}

      <SectionHeader title="Historial" />
      {incident.historial.map((event) => (
        <Card key={event.id} style={styles.timelineItem}>
          <Label weight="800">{event.accion}</Label>
          <Label tone="muted" size="xs">{formatTime(event.created_at)} - {statusLabel[event.estado_nuevo]}</Label>
          {event.comentario ? <Label size="sm">{event.comentario}</Label> : null}
        </Card>
      ))}
    </ScrollView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Label size="xs" tone="muted" weight="800">{label}</Label>
      <Label size="sm" style={styles.infoValue}>{value}</Label>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  backButton: {
    alignSelf: "flex-start",
    minHeight: 32,
    paddingHorizontal: 0,
  },
  header: {
    gap: spacing.sm,
  },
  badges: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  block: {
    gap: spacing.sm,
  },
  emptyLocation: {
    gap: spacing.xs,
  },
  infoRow: {
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  infoValue: {
    flex: 1,
    textAlign: "right",
  },
  description: {
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
  },
  note: {
    minHeight: 104,
    paddingTop: spacing.md,
    textAlignVertical: "top",
  },
  mapCard: {
    height: 240,
    overflow: "hidden",
    padding: 0,
  },
  timelineItem: {
    gap: spacing.xs,
    padding: spacing.md,
  },
  commentHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
});
