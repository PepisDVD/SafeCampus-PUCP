import React from "react";
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Badge, Button, Card, Field, Label, SectionHeader, colors, radius, spacing } from "@safecampus/ui-native";

import {
  listLostFoundCategories,
  listLostFoundCustodies,
  listMyLostFoundMobileRecords,
  registerLostFoundMobileReception,
  uploadLostFoundCasePhotos,
} from "../../shared/api/client";
import { logger } from "../../shared/fallback/logger";
import type {
  LostFoundCase,
  LostFoundCategory,
  LostFoundCustody,
  LostFoundReceptionPayload,
} from "../../shared/types/api";
import { CameraIcon, PackageIcon, PlusIcon } from "../../shared/ui/icons";

type LostFoundTab = "custodias" | "mis";

type ReceptionForm = {
  titulo: string;
  descripcion: string;
  categoria_id: string;
  lugar_referencia: string;
  ubicacion_custodia: string;
  observaciones_custodia: string;
} & Record<string, string>;

const EMPTY_FORM: ReceptionForm = {
  titulo: "",
  descripcion: "",
  categoria_id: "",
  lugar_referencia: "",
  ubicacion_custodia: "",
  observaciones_custodia: "",
};

const MAX_PHOTOS = 3;
const LOST_FOUND_CACHE_TTL_MS = 60_000;
const LIMITS = {
  titulo: { min: 3, max: 200 },
  descripcion: { min: 10, max: 4000 },
  lugar_referencia: { min: 3, max: 255 },
  ubicacion_custodia: { min: 2, max: 255 },
  observaciones_custodia: { min: 0, max: 2000 },
  metadato: { min: 0, max: 120 },
};

type LostFoundSnapshot = {
  categorias: LostFoundCategory[];
  custodias: LostFoundCustody[];
  misRegistros: LostFoundCase[];
  updatedAt: number;
};

const lostFoundCache = new Map<string, LostFoundSnapshot>();
const lostFoundRefreshes = new Map<string, Promise<LostFoundSnapshot>>();

function getFreshSnapshot(token: string) {
  const snapshot = lostFoundCache.get(token);
  if (!snapshot) return null;
  return Date.now() - snapshot.updatedAt < LOST_FOUND_CACHE_TTL_MS ? snapshot : null;
}

function cacheSnapshot(token: string, snapshot: Omit<LostFoundSnapshot, "updatedAt">) {
  const next = { ...snapshot, updatedAt: Date.now() };
  lostFoundCache.set(token, next);
  return next;
}

async function fetchLostFoundSnapshot(token: string) {
  const current = lostFoundRefreshes.get(token);
  if (current) return current;

  const request = Promise.all([
    listLostFoundCustodies(token),
    listMyLostFoundMobileRecords(token),
    listLostFoundCategories(token),
  ])
    .then(([nextCustodias, nextRegistros, nextCategorias]) => cacheSnapshot(token, {
      categorias: nextCategorias,
      custodias: nextCustodias.items,
      misRegistros: nextRegistros.items,
    }))
    .finally(() => {
      lostFoundRefreshes.delete(token);
    });
  lostFoundRefreshes.set(token, request);
  return request;
}

export function LostFoundScreen({ active = true, token }: { active?: boolean; token: string }) {
  const [tab, setTab] = React.useState<LostFoundTab>("custodias");
  const cachedSnapshot = getFreshSnapshot(token);
  const [custodias, setCustodias] = React.useState<LostFoundCustody[]>(() => cachedSnapshot?.custodias ?? []);
  const [misRegistros, setMisRegistros] = React.useState<LostFoundCase[]>(() => cachedSnapshot?.misRegistros ?? []);
  const [categorias, setCategorias] = React.useState<LostFoundCategory[]>(() => cachedSnapshot?.categorias ?? []);
  const [selectedCustodia, setSelectedCustodia] = React.useState<LostFoundCustody | null>(null);
  const [selectedRegistro, setSelectedRegistro] = React.useState<LostFoundCase | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<ReceptionForm>(EMPTY_FORM);
  const [photoUris, setPhotoUris] = React.useState<string[]>([]);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [confirmation, setConfirmation] = React.useState<{ codigo: string } | null>(null);
  const [cameraOpen, setCameraOpen] = React.useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = React.useRef<CameraView | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const applySnapshot = React.useCallback((snapshot: LostFoundSnapshot) => {
    setCustodias(snapshot.custodias);
    setMisRegistros(snapshot.misRegistros);
    setCategorias(snapshot.categorias);
    const firstCategory = snapshot.categorias[0];
    if (firstCategory) {
      setForm((current) => (current.categoria_id ? current : { ...current, categoria_id: firstCategory.id }));
    }
  }, []);

  const refresh = React.useCallback(async (force = false) => {
    const freshSnapshot = force ? null : getFreshSnapshot(token);
    if (freshSnapshot) {
      applySnapshot(freshSnapshot);
      return;
    }
    setLoading(custodias.length === 0 && misRegistros.length === 0 && categorias.length === 0);
    try {
      applySnapshot(await fetchLostFoundSnapshot(token));
    } catch (error) {
      logger.error("lost-found-mobile/refresh", error);
      Alert.alert("Lost & Found", "No se pudo cargar la informacion del modulo.");
    } finally {
      setLoading(false);
    }
  }, [applySnapshot, categorias.length, custodias.length, misRegistros.length, token]);

  React.useEffect(() => {
    if (active) void refresh();
  }, [active, refresh]);

  const selectedCategoria = categorias.find((item) => item.id === form.categoria_id);
  const metadatos = activeFields(selectedCategoria);

  const submit = async () => {
    const error = validate(form, metadatos);
    if (error) {
      Alert.alert("Revisa el registro", error);
      return;
    }
    setSubmitting(true);
    try {
      const body: LostFoundReceptionPayload = {
        tipo: "ENCONTRADO",
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        categoria_id: form.categoria_id,
        lugar_referencia: form.lugar_referencia.trim(),
        fecha_evento: new Date().toISOString(),
        etiquetas: ["OPERADOR_MOVIL"],
        metadatos: Object.fromEntries(
          metadatos.map((field) => [field.codigo, (form as Record<string, string>)[`meta:${field.codigo}`] ?? ""]).filter(([, value]) => String(value).trim()),
        ),
        contacto_info: null,
        ubicacion_custodia: form.ubicacion_custodia.trim(),
        observaciones_custodia: form.observaciones_custodia.trim() || null,
        es_perecible: Boolean(selectedCategoria?.es_perecible),
      };
      const result = await registerLostFoundMobileReception(token, body);
      if (photoUris.length > 0) {
        await uploadLostFoundCasePhotos(token, result.caso.id, photoUris);
      }
      setConfirmation({ codigo: result.caso.codigo });
      setForm({ ...EMPTY_FORM, categoria_id: categorias[0]?.id ?? "" });
      setPhotoUris([]);
      setFormOpen(false);
      await refresh(true);
      setTab("mis");
    } catch (error) {
      logger.error("lost-found-mobile/register", error);
      Alert.alert("No se pudo registrar", error instanceof Error ? error.message : "Intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const openCamera = async () => {
    if (photoUris.length >= MAX_PHOTOS) {
      Alert.alert("Limite alcanzado", "Puedes adjuntar hasta 3 imagenes.");
      return;
    }
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert("Camara no disponible", "Habilita el permiso de camara para adjuntar una foto.");
        return;
      }
    }
    setCameraOpen(true);
  };

  const takePhoto = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.75 });
    if (photo?.uri) {
      setPhotoUris((current) => [...current, photo.uri].slice(0, MAX_PHOTOS));
      setCameraOpen(false);
    }
  };

  const pickImages = async () => {
    if (photoUris.length >= MAX_PHOTOS) {
      Alert.alert("Limite alcanzado", "Puedes adjuntar hasta 3 imagenes.");
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Galeria no disponible", "Habilita el permiso de galeria para adjuntar imagenes.");
      return;
    }
    const remaining = MAX_PHOTOS - photoUris.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ["images"],
      quality: 0.75,
      selectionLimit: remaining,
    });
    if (result.canceled) return;
    const selected = result.assets.map((asset) => asset.uri).filter(Boolean).slice(0, remaining);
    setPhotoUris((current) => [...current, ...selected].slice(0, MAX_PHOTOS));
  };

  const removePhoto = (uri: string) => {
    setPhotoUris((current) => current.filter((item) => item !== uri));
    setImagePreview((current) => (current === uri ? null : current));
  };

  const closeForm = () => {
    setFormOpen(false);
    setImagePreview(null);
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <PackageIcon color={colors.primary} size={28} />
          <View>
            <Label size="xl" weight="900">Lost & Found</Label>
            <Label size="sm" tone="muted">Custodias y recepciones operativas</Label>
          </View>
        </View>
        {loading ? <Badge tone="info">Sincronizando</Badge> : null}
      </View>

      <View style={styles.tabs}>
        <Segment active={tab === "custodias"} label="Custodias" onPress={() => setTab("custodias")} />
        <Segment active={tab === "mis"} label="Mis registros" onPress={() => setTab("mis")} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {tab === "custodias" ? (
          <>
            <SectionHeader title="Activas y proximas a vencer" />
            {custodias.length === 0 ? (
              <EmptyState text="No hay custodias activas por ahora." />
            ) : (
              custodias.map((item) => (
                <CustodyCard key={item.id} item={item} onPress={() => setSelectedCustodia(item)} />
              ))
            )}
          </>
        ) : (
          <>
            <SectionHeader title="Registrados desde este operador" />
            {misRegistros.length === 0 ? (
              <EmptyState text="Aun no registras recepciones desde mobile." />
            ) : (
              misRegistros.map((item) => (
                <RecordCard key={item.id} item={item} onPress={() => setSelectedRegistro(item)} />
              ))
            )}
          </>
        )}
      </ScrollView>

      <Pressable accessibilityRole="button" accessibilityLabel="Registrar recepcion" onPress={() => setFormOpen(true)} style={styles.fab}>
        <PlusIcon size={30} />
      </Pressable>

      <DetailModal
        custodia={selectedCustodia}
        registro={selectedRegistro}
        onPreviewImage={setImagePreview}
        onClose={() => {
          setSelectedCustodia(null);
          setSelectedRegistro(null);
        }}
      />

      <Modal visible={formOpen} animationType="slide" onRequestClose={closeForm}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <View style={styles.titleRow}>
              <CameraIcon color={colors.primary} />
              <View>
                <Label size="xl" weight="900">Registrar recepcion</Label>
                <Label size="sm" tone="muted">Crea el caso operativo y su custodia.</Label>
              </View>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.formContent}>
            <FormField
              maxLength={LIMITS.titulo.max}
              minLength={LIMITS.titulo.min}
              placeholder="Titulo del objeto"
              value={form.titulo}
              onChangeText={(titulo) => setForm((current) => ({ ...current, titulo }))}
            />
            <FormField
              maxLength={LIMITS.descripcion.max}
              minLength={LIMITS.descripcion.min}
              placeholder="Descripcion detallada"
              value={form.descripcion}
              multiline
              style={styles.multiline}
              onChangeText={(descripcion) => setForm((current) => ({ ...current, descripcion }))}
            />

            <Label size="xs" tone="muted" weight="800">Categoria</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRail}>
              {categorias.map((categoria) => (
                <Pressable
                  key={categoria.id}
                  accessibilityRole="button"
                  onPress={() => setForm((current) => ({ ...current, categoria_id: categoria.id }))}
                  style={[styles.categoryChip, form.categoria_id === categoria.id && styles.categoryChipActive]}
                >
                  <Label size="xs" weight="800" tone={form.categoria_id === categoria.id ? "default" : "muted"}>
                    {categoria.nombre}
                  </Label>
                </Pressable>
              ))}
            </ScrollView>

            {metadatos.map((field) => (
              <FormField
                key={field.codigo}
                maxLength={LIMITS.metadato.max}
                placeholder={field.etiqueta}
                value={(form as Record<string, string>)[`meta:${field.codigo}`] ?? ""}
                onChangeText={(value) => setForm((current) => ({ ...current, [`meta:${field.codigo}`]: value }))}
              />
            ))}

            <FormField
              maxLength={LIMITS.lugar_referencia.max}
              minLength={LIMITS.lugar_referencia.min}
              placeholder="Lugar donde fue encontrado"
              value={form.lugar_referencia}
              onChangeText={(lugar_referencia) => setForm((current) => ({ ...current, lugar_referencia }))}
            />
            <FormField
              maxLength={LIMITS.ubicacion_custodia.max}
              minLength={LIMITS.ubicacion_custodia.min}
              placeholder="Ubicacion de custodia"
              value={form.ubicacion_custodia}
              onChangeText={(ubicacion_custodia) => setForm((current) => ({ ...current, ubicacion_custodia }))}
            />
            <View style={styles.photoActions}>
              <View style={styles.photoHeader}>
                <Label size="xs" tone="muted" weight="800">Evidencia ({photoUris.length}/{MAX_PHOTOS})</Label>
                {photoUris.length >= MAX_PHOTOS ? <Label size="xs" tone="muted">Limite alcanzado</Label> : null}
              </View>
              <View style={styles.photoButtons}>
                <Button variant="secondary" onPress={openCamera} disabled={photoUris.length >= MAX_PHOTOS}>
                  <CameraIcon color={colors.text} size={18} />
                  <Label size="sm" weight="900">Camara</Label>
                </Button>
                <Button variant="secondary" onPress={pickImages} disabled={photoUris.length >= MAX_PHOTOS}>
                  <PackageIcon color={colors.text} size={18} />
                  <Label size="sm" weight="900">Galeria</Label>
                </Button>
              </View>
              {photoUris.length > 0 ? (
                <View style={styles.previewGrid}>
                  {photoUris.map((uri, index) => (
                    <View key={uri} style={styles.previewTile}>
                      <Pressable accessibilityRole="imagebutton" accessibilityLabel={`Ver imagen ${index + 1}`} onPress={() => setImagePreview(uri)} style={styles.previewPressable}>
                        <Image source={{ uri }} style={styles.previewImage} />
                      </Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Quitar imagen ${index + 1}`} onPress={() => removePhoto(uri)} style={styles.removePhoto}>
                        <Label size="xs" weight="900">X</Label>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
            <FormField
              maxLength={LIMITS.observaciones_custodia.max}
              placeholder="Observacion de recepcion"
              value={form.observaciones_custodia}
              multiline
              style={styles.multiline}
              onChangeText={(observaciones_custodia) => setForm((current) => ({ ...current, observaciones_custodia }))}
            />
          </ScrollView>
          <View style={styles.modalActions}>
            <Button variant="ghost" onPress={closeForm}>
              <Label weight="900">Cancelar</Label>
            </Button>
            <Button onPress={submit} loading={submitting}>
              <Label weight="900">Registrar</Label>
            </Button>
          </View>
        </View>
      </Modal>

      <ImagePreviewModal uri={imagePreview} onClose={() => setImagePreview(null)} />

      <ConfirmationModal
        codigo={confirmation?.codigo ?? null}
        onClose={() => setConfirmation(null)}
      />

      <Modal visible={cameraOpen} animationType="slide" onRequestClose={() => setCameraOpen(false)}>
        <View style={styles.cameraRoot}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          <View style={styles.cameraActions}>
            <Button variant="ghost" onPress={() => setCameraOpen(false)}>
              <Label weight="900">Cancelar</Label>
            </Button>
            <Button onPress={takePhoto}>
              <CameraIcon color={colors.text} size={18} />
              <Label weight="900">Capturar</Label>
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Segment({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.segment, active && styles.segmentActive]}>
      <Label size="sm" weight="900" tone={active ? "default" : "muted"}>{label}</Label>
    </Pressable>
  );
}

function CustodyCard({ item, onPress }: { item: LostFoundCustody; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardText}>
            <Label weight="900">{item.codigo ?? item.caso_id}</Label>
            <Label size="sm" tone="muted">{item.titulo ?? "Objeto encontrado"}</Label>
          </View>
          <Badge tone={item.estado === "PROXIMA_VENCER" ? "warning" : "success"}>{custodyStatus(item.estado)}</Badge>
        </View>
        <Label size="sm">Ubicacion: {item.ubicacion_custodia}</Label>
        <Label size="xs" tone="muted">Tiempo en custodia: {daysBetween(item.fecha_recepcion)} dias</Label>
      </Card>
    </Pressable>
  );
}

function RecordCard({ item, onPress }: { item: LostFoundCase; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardText}>
            <Label weight="900">{item.codigo}</Label>
            <Label size="sm" tone="muted">{item.titulo}</Label>
          </View>
          <Badge tone="info">Mobile</Badge>
        </View>
        <Label size="sm">{item.categoria_nombre ?? "Sin categoria"} · {item.lugar_referencia ?? "Sin lugar"}</Label>
      </Card>
    </Pressable>
  );
}

function DetailModal({
  custodia,
  registro,
  onPreviewImage,
  onClose,
}: {
  custodia: LostFoundCustody | null;
  registro: LostFoundCase | null;
  onPreviewImage: (uri: string) => void;
  onClose: () => void;
}) {
  const visible = Boolean(custodia || registro);
  const images = allCaseImages(custodia ?? registro);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView style={styles.modalRoot} contentContainerStyle={styles.formContent}>
        <Label size="xl" weight="900">{custodia?.codigo ?? registro?.codigo ?? "Detalle"}</Label>
        {images.length > 0 ? (
          <View style={styles.detailImages}>
            {images.map((uri, index) => (
              <Pressable key={uri} accessibilityRole="imagebutton" accessibilityLabel={`Ver evidencia ${index + 1}`} onPress={() => onPreviewImage(uri)}>
                <Image source={{ uri }} style={index === 0 ? styles.image : styles.detailThumb} />
              </Pressable>
            ))}
          </View>
        ) : null}
        <Info label="Objeto" value={custodia?.titulo ?? registro?.titulo ?? "Objeto encontrado"} />
        <Info label="Categoria" value={custodia?.categoria_nombre ?? registro?.categoria_nombre ?? "No disponible"} />
        <Info label="Ubicacion" value={custodia?.ubicacion_custodia ?? registro?.lugar_referencia ?? "No disponible"} />
        <Info label="Estado" value={custodia ? custodyStatus(custodia.estado) : caseStatus(registro?.estado)} />
        {custodia ? <Info label="Tiempo en custodia" value={`${daysBetween(custodia.fecha_recepcion)} dias`} /> : null}
        <Button onPress={onClose}>
          <Label weight="900">Cerrar</Label>
        </Button>
      </ScrollView>
    </Modal>
  );
}

function FormField({
  value,
  maxLength,
  minLength,
  ...props
}: React.ComponentProps<typeof Field> & { value: string; maxLength: number; minLength?: number }) {
  const length = value.length;
  const remaining = maxLength - length;
  const warning = remaining <= Math.max(12, Math.round(maxLength * 0.1));
  const belowMin = Boolean(minLength && length > 0 && length < minLength);
  return (
    <View style={styles.fieldGroup}>
      <Field value={value} maxLength={maxLength} {...props} />
      <View style={styles.counterRow}>
        {belowMin ? <Label size="xs" tone="warning">Minimo {minLength} caracteres</Label> : <View />}
        <Label size="xs" tone={warning ? "warning" : "muted"}>{length}/{maxLength}</Label>
      </View>
    </View>
  );
}

function ImagePreviewModal({ uri, onClose }: { uri: string | null; onClose: () => void }) {
  return (
    <Modal visible={Boolean(uri)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.previewModalRoot}>
        <Pressable style={styles.previewBackdrop} onPress={onClose} />
        <Card style={styles.previewModalCard}>
          {uri ? <Image source={{ uri }} style={styles.previewModalImage} /> : null}
          <Button onPress={onClose}>
            <Label weight="900">Cerrar</Label>
          </Button>
        </Card>
      </View>
    </Modal>
  );
}

function ConfirmationModal({ codigo, onClose }: { codigo: string | null; onClose: () => void }) {
  return (
    <Modal visible={Boolean(codigo)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.previewModalRoot}>
        <Pressable style={styles.previewBackdrop} onPress={onClose} />
        <Card style={styles.confirmationCard}>
          <View style={styles.confirmationIcon}>
            <PackageIcon color={colors.primary} size={28} />
          </View>
          <Label size="lg" weight="900">Recepcion registrada</Label>
          <Label tone="muted">Caso {codigo} creado y asociado a custodia.</Label>
          <Button onPress={onClose} style={styles.confirmationButton}>
            <Label weight="900">Entendido</Label>
          </Button>
        </Card>
      </View>
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.infoCard}>
      <Label size="xs" tone="muted" weight="800">{label}</Label>
      <Label>{value}</Label>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card style={styles.empty}>
      <Label tone="muted">{text}</Label>
    </Card>
  );
}

function activeFields(categoria?: LostFoundCategory) {
  return (categoria?.metadatos_schema?.campos ?? []).filter((field) => field.activo !== false);
}

function validate(form: ReceptionForm, fields: ReturnType<typeof activeFields>) {
  if (!within(form.titulo, LIMITS.titulo)) return "El titulo debe tener entre 3 y 200 caracteres.";
  if (!within(form.descripcion, LIMITS.descripcion)) return "La descripcion debe tener entre 10 y 4000 caracteres.";
  if (!form.categoria_id) return "Selecciona una categoria.";
  if (!within(form.lugar_referencia, LIMITS.lugar_referencia)) return "Indica un lugar valido de hasta 255 caracteres.";
  if (!within(form.ubicacion_custodia, LIMITS.ubicacion_custodia)) return "Indica una ubicacion de custodia valida.";
  if (!within(form.observaciones_custodia, LIMITS.observaciones_custodia)) return "La observacion no debe superar 2000 caracteres.";
  for (const field of fields) {
    const value = ((form as Record<string, string>)[`meta:${field.codigo}`] ?? "").trim();
    if (field.requerido && !value) return `Completa ${field.etiqueta}.`;
    if (value.length > LIMITS.metadato.max) return `${field.etiqueta} no debe superar ${LIMITS.metadato.max} caracteres.`;
  }
  return "";
}

function within(value: string, limits: { min: number; max: number }) {
  const length = value.trim().length;
  return length >= limits.min && length <= limits.max;
}

function allCaseImages(item: LostFoundCase | LostFoundCustody | null) {
  if (!item) return [];
  return [item.foto_url, ...(item.foto_adicional_urls ?? [])].filter((uri): uri is string => Boolean(uri));
}

function daysBetween(value: string) {
  const start = new Date(value).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / 86_400_000));
}

function custodyStatus(value: LostFoundCustody["estado"]) {
  if (value === "PROXIMA_VENCER") return "Proxima a vencer";
  if (value === "VENCIDA") return "Vencida";
  if (value === "DEVUELTA") return "Devuelta";
  if (value === "DESCARTADA") return "Descartada";
  return "Activa";
}

function caseStatus(value?: LostFoundCase["estado"]) {
  if (value === "ABIERTO") return "Abierto";
  if (value === "EN_REVISION") return "En revision";
  if (value === "CONFIRMADO") return "Confirmado";
  if (value === "EN_CUSTODIA") return "En custodia";
  if (value === "DEVUELTO") return "Devuelto";
  if (value === "DESCARTADO") return "Descartado";
  if (value === "CERRADO") return "Cerrado";
  return "No disponible";
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  header: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  tabs: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  segment: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    padding: spacing.md,
  },
  segmentActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: 96,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  counterRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  card: {
    gap: spacing.sm,
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  cardText: {
    flex: 1,
    gap: spacing.xs,
  },
  fab: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 30,
    bottom: 20,
    height: 60,
    justifyContent: "center",
    position: "absolute",
    right: 20,
    width: 60,
  },
  modalRoot: {
    backgroundColor: colors.background,
    flex: 1,
  },
  modalHeader: {
    padding: spacing.lg,
  },
  formContent: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: 96,
  },
  modalActions: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  multiline: {
    minHeight: 92,
    paddingTop: spacing.md,
    textAlignVertical: "top",
  },
  categoryRail: {
    gap: spacing.sm,
  },
  categoryChip: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  empty: {
    alignItems: "center",
  },
  infoCard: {
    gap: spacing.xs,
  },
  image: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    height: 220,
    width: "100%",
  },
  detailImages: {
    gap: spacing.sm,
  },
  detailThumb: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    height: 96,
    width: "100%",
  },
  photoActions: {
    gap: spacing.sm,
  },
  photoHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  photoButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  previewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  previewTile: {
    height: 92,
    position: "relative",
    width: 92,
  },
  previewPressable: {
    flex: 1,
  },
  previewImage: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    height: "100%",
    width: "100%",
  },
  removePhoto: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    position: "absolute",
    right: -6,
    top: -6,
    width: 24,
  },
  previewModalRoot: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  previewBackdrop: {
    backgroundColor: "rgba(0,0,0,0.55)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  previewModalCard: {
    gap: spacing.md,
    width: "100%",
  },
  previewModalImage: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    height: 360,
    width: "100%",
  },
  confirmationCard: {
    alignItems: "center",
    gap: spacing.md,
    width: "100%",
  },
  confirmationIcon: {
    alignItems: "center",
    backgroundColor: colors.primaryMuted,
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  confirmationButton: {
    alignSelf: "stretch",
  },
  cameraRoot: {
    backgroundColor: colors.background,
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraActions: {
    backgroundColor: colors.surface,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg,
  },
});
