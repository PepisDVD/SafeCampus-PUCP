"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Input,
  Label,
  MultiSelectFilter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Spinner,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  cn,
} from "@safecampus/ui-kit";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Eye,
  History,
  ImagePlus,
  MapPin,
  MessageSquare,
  PackageCheck,
  PackageSearch,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
  Star,
  Trash2,
  UserCircle2,
  X,
} from "lucide-react";
import { toast } from "@safecampus/ui-kit";
import { lostFoundClient, type CasoLfCreatePayload } from "../client";
import { DEFAULT_TAG, estadoLabel, tagMeta, tagsForTipo, tipoLabel } from "../presentation";
import { COMMENT_SORT_OPTIONS, filterByTags, sortRootComments, type CommentSort } from "./comment-sorting";
import { EstadoLfBadge } from "./estado-lf-badge";
import { CharCounter, LF_TEXT_LIMITS } from "./text-field-help";
import { activeMetadatoCampos, MetadatoFields, validateMetadatos, valuesToMetadatos } from "./metadato-fields";
import { EditCaseModal } from "./edit-case-modal";
import { CaseCard, CaseListSkeleton, CaseCardSkeleton } from "./lost-found-case-card";
import { LostFoundFeedFilters } from "./lost-found-feed-filters";
import { LostFoundLocationPicker, formatRadius, type LocationSelection } from "./lost-found-location-picker";
import {
  TIME_PRESETS,
  countAdvancedFilters,
  emptyCommunityFilters,
  toFeedParams,
  type CommunityFilters,
} from "./feed-filters";
import type { CasoLfDetail, CasoLfListItem, CategoriaLf, MatchLf, UbicacionMaestra } from "../types";
import { fromLimaDateTimeInputValue, toLimaDateTimeInputValue, formatLimaDateTime } from "@/lib/lima-date";

type Props = {
  categorias: CategoriaLf[];
  initialFeed: CasoLfListItem[];
  initialMine?: CasoLfListItem[];
  ubicaciones?: UbicacionMaestra[];
};

type FotoAdjunta = {
  file: File;
  previewUrl: string;
};

type CommunityFormErrors = Partial<Record<
  "titulo" | "descripcion" | "categoria_id" | "lugar_referencia" | "fecha_evento" | "fotos" | "metadatos",
  string
>>;
type CommunityTouchedFields = Partial<Record<keyof CommunityFormErrors, boolean>>;

const DRAFT_KEY = "safecampus:lost-found:draft";
const ALL_CATEGORIES = "__todas__";
const DEFAULT_MAP_POINT = { lat: -12.06945, lng: -77.08055 };
const emptyForm: CasoLfCreatePayload = {
  tipo: "PERDIDO",
  titulo: "",
  descripcion: "",
  categoria_id: "",
  lugar_referencia: "",
  fecha_evento: new Date().toISOString(),
  color_principal: "",
  marca: "",
  etiquetas: [],
};
const commentableStates = new Set(["ABIERTO", "EN_REVISION"]);
const terminalStates = new Set(["CERRADO", "DEVUELTO", "DESCARTADO"]);

const LeafletCoordinatePicker = dynamic(
  () => import("@/features/admin/components/maestros/leaflet-coordinate-picker").then((mod) => mod.LeafletCoordinatePicker),
  { ssr: false },
);

export function LostFoundCommunity({ categorias, initialFeed, initialMine, ubicaciones }: Props) {
  const [feed, setFeed] = useState(initialFeed);
  const [operatorFeed, setOperatorFeed] = useState<CasoLfListItem[]>([]);
  const [mine, setMine] = useState(initialMine ?? []);
  const [mineLoaded, setMineLoaded] = useState(Boolean(initialMine));
  const [mineLoading, setMineLoading] = useState(false);
  const [ubicacionesMaestras, setUbicacionesMaestras] = useState(ubicaciones ?? []);
  const [ubicacionesLoading, setUbicacionesLoading] = useState(false);
  const ubicacionesLoadedRef = useRef(Boolean(ubicaciones?.length));
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filters, setFilters] = useState<CommunityFilters>(emptyCommunityFilters);
  const [feedLoading, setFeedLoading] = useState(false);
  const [operatorFeedLoading, setOperatorFeedLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [newCaseOpen, setNewCaseOpen] = useState(false);
  const [form, setForm] = useState<CasoLfCreatePayload>(() => {
    if (typeof window === "undefined") return emptyForm;
    const saved = window.localStorage.getItem(DRAFT_KEY);
    if (!saved) return emptyForm;
    try {
      return { ...emptyForm, ...JSON.parse(saved) };
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
      return emptyForm;
    }
  });
  const [formTouched, setFormTouched] = useState<CommunityTouchedFields>({});
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [metadatos, setMetadatos] = useState<Record<string, string>>({});
  const metadatoCampos = useMemo(
    () => activeMetadatoCampos(categorias.find((categoria) => categoria.id === form.categoria_id)),
    [categorias, form.categoria_id],
  );
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState("OTRO");
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [mapDraft, setMapDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [tagInput, setTagInput] = useState(() => etiquetasToInput(form.etiquetas));
  const [photos, setPhotos] = useState<FotoAdjunta[]>([]);
  const [photoPreview, setPhotoPreview] = useState<FotoAdjunta | null>(null);
  const photosRef = useRef<FotoAdjunta[]>([]);
  const [mineStatus, setMineStatus] = useState("TODOS");
  const [activeTab, setActiveTab] = useState("feed");
  const [selected, setSelected] = useState<CasoLfDetail | null>(null);
  const [openingDetail, setOpeningDetail] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [matches, setMatches] = useState<MatchLf[]>([]);
  const [comment, setComment] = useState("");
  const [commentTag, setCommentTag] = useState<string>(DEFAULT_TAG);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [threadSubscribed, setThreadSubscribed] = useState(true);
  const [isPending, startTransition] = useTransition();

  const mineIds = useMemo(() => new Set(mine.map((item) => item.id)), [mine]);
  const filteredMine = useMemo(
    () => mine.filter((item) => mineStatus === "TODOS" || item.estado === mineStatus),
    [mine, mineStatus],
  );
  const advancedCount = countAdvancedFilters(filters);
  const hasLocation = filters.lat !== null && filters.lng !== null && filters.radio_km !== null;
  const isPristine = advancedCount === 0 && !filters.timePreset && !hasLocation && !filters.search.trim();

  // Refs para handlers estables (evitan cierres obsoletos en el infinite scroll).
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const nextCursorRef = useRef(nextCursor);
  nextCursorRef.current = nextCursor;
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...form, etiquetas: form.etiquetas ?? [] }));
  }, [form]);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    };
  }, []);

  const reloadFeed = useCallback(async () => {
    setFeedLoading(true);
    try {
      const next = await lostFoundClient.feed(toFeedParams(filtersRef.current));
      setFeed(next.items);
      setNextCursor(next.next_cursor ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el feed");
    } finally {
      setFeedLoading(false);
    }
  }, []);

  const reloadOperatorFeed = useCallback(async () => {
    setOperatorFeedLoading(true);
    try {
      const next = await lostFoundClient.feed({ ...toFeedParams(filtersRef.current), origen: "OPERADOR_MOVIL" });
      setOperatorFeed(next.items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar las recepciones");
    } finally {
      setOperatorFeedLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !nextCursorRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const next = await lostFoundClient.feed(toFeedParams(filtersRef.current, nextCursorRef.current));
      setFeed((current) => [...current, ...next.items]);
      setNextCursor(next.next_cursor ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar más casos");
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  // Recarga el feed (con debounce) cuando cambian los filtros. El primer render
  // usa el feed inicial del servidor, así que se omite.
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    const handle = window.setTimeout(() => {
      if (activeTab === "recepciones") void reloadOperatorFeed();
      else void reloadFeed();
    }, 300);
    return () => window.clearTimeout(handle);
  }, [activeTab, filters, reloadFeed, reloadOperatorFeed]);

  useEffect(() => {
    if (activeTab === "recepciones" && operatorFeed.length === 0 && !operatorFeedLoading) {
      void reloadOperatorFeed();
    }
  }, [activeTab, operatorFeed.length, operatorFeedLoading, reloadOperatorFeed]);

  const patchFilters = (partial: Partial<CommunityFilters>) => setFilters((current) => ({ ...current, ...partial }));

  const applyLocation = (value: LocationSelection | null) => {
    patchFilters({
      lat: value?.lat ?? null,
      lng: value?.lng ?? null,
      radio_km: value?.radio_km ?? null,
    });
  };

  const loadMine = useCallback(async () => {
    if (mineLoading) return;
    setMineLoading(true);
    try {
      const nextMine = await lostFoundClient.misCasos();
      setMine(nextMine.items);
      setMineLoaded(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar tus casos");
    } finally {
      setMineLoading(false);
    }
  }, [mineLoading]);

  const loadUbicaciones = useCallback(async () => {
    if (ubicacionesLoadedRef.current || ubicacionesLoading) return;
    setUbicacionesLoading(true);
    try {
      const nextUbicaciones = await lostFoundClient.ubicacionesMaestras();
      ubicacionesLoadedRef.current = true;
      setUbicacionesMaestras(nextUbicaciones);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar las ubicaciones");
    } finally {
      setUbicacionesLoading(false);
    }
  }, [ubicacionesLoading]);

  useEffect(() => {
    if (activeTab === "mis" && !mineLoaded) void loadMine();
  }, [activeTab, loadMine, mineLoaded]);

  useEffect(() => {
    if (newCaseOpen) void loadUbicaciones();
  }, [loadUbicaciones, newCaseOpen]);

  const openDetail = (item: CasoLfListItem) => {
    setOpeningDetail(true);
    setSelected(null);
    startTransition(async () => {
      try {
        const detail = await lostFoundClient.detalle(item.id);
        setSelected(detail);
        setReplyingTo(null);
        setThreadSubscribed(true);
        await lostFoundClient.actualizarParticipacion(item.id, true, true).catch(() => undefined);
        setMatches(await lostFoundClient.matches(item.id).catch(() => []));
      } catch (error) {
        setOpeningDetail(false);
        toast.error(error instanceof Error ? error.message : "No se pudo abrir el hilo");
      } finally {
        setOpeningDetail(false);
      }
    });
  };

  const closeDetail = () => {
    setSelected(null);
    setOpeningDetail(false);
  };

  const createCase = () => {
    setFormSubmitted(true);
    const validation = validateCase(form, photos);
    if (validation) {
      toast.error(validation);
      return;
    }
    const metaError = validateMetadatos(metadatoCampos, metadatos);
    if (metaError) {
      toast.error(metaError);
      return;
    }
    startTransition(async () => {
      try {
        const created = await lostFoundClient.crearCaso(normalizeCreateForm({
          ...form,
          metadatos: valuesToMetadatos(metadatoCampos, metadatos),
        }));
        const detail = photos.length
          ? await lostFoundClient.subirFotosArchivos(created.id, photos.map((photo) => photo.file))
          : await lostFoundClient.detalle(created.id);
        const [nextFeed, nextMine] = await Promise.all([lostFoundClient.feed(toFeedParams(filtersRef.current)), lostFoundClient.misCasos()]);
        setFeed(nextFeed.items);
        setNextCursor(nextFeed.next_cursor ?? null);
        setMine(nextMine.items);
        setSelected(detail);
        setMatches(await lostFoundClient.matches(created.id).catch(() => []));
        setForm(emptyForm);
        setFormTouched({});
        setFormSubmitted(false);
        setMetadatos({});
        resetPhotos();
        setUbicacionSeleccionada("OTRO");
        setTagInput("");
        setNewCaseOpen(false);
        window.localStorage.removeItem(DRAFT_KEY);
        toast.success(`Caso ${created.codigo} registrado`);
        requestNotificationPermission();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo registrar el caso");
      }
    });
  };

  const refreshMine = async () => {
    const nextMine = await lostFoundClient.misCasos();
    setMine(nextMine.items);
    setMineLoaded(true);
  };

  const handleUbicacionChange = (value: string) => {
    setFormTouched((current) => ({ ...current, lugar_referencia: true }));
    setUbicacionSeleccionada(value);
    if (value === "OTRO") {
      setForm((current) => ({ ...current, lugar_referencia: "", latitud: null, longitud: null }));
      openMapDialog();
      return;
    }
    const ubicacion = ubicacionesMaestras.find((item) => item.id === value);
    if (ubicacion) {
      setForm((current) => ({
        ...current,
        lugar_referencia: ubicacion.nombre,
        latitud: ubicacion.latitud,
        longitud: ubicacion.longitud,
      }));
    }
  };

  const openMapDialog = () => {
    const selectedLocation = ubicacionesMaestras.find((item) => item.id === ubicacionSeleccionada);
    setMapDraft({
      lat: form.latitud ?? selectedLocation?.latitud ?? DEFAULT_MAP_POINT.lat,
      lng: form.longitud ?? selectedLocation?.longitud ?? DEFAULT_MAP_POINT.lng,
    });
    setMapDialogOpen(true);
  };

  const applyMapCoordinates = () => {
    if (!mapDraft) {
      return;
    }
    setForm((current) => ({
      ...current,
      latitud: Number(mapDraft.lat.toFixed(6)),
      longitud: Number(mapDraft.lng.toFixed(6)),
    }));
    setMapDialogOpen(false);
    toast.success("Ubicacion marcada en el mapa");
  };

  const handlePhotos = (files: FileList | null) => {
    setFormTouched((current) => ({ ...current, fotos: true }));
    const selectedFiles = Array.from(files ?? []);
    const imageFiles = selectedFiles.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length !== selectedFiles.length) {
      toast.error("Solo se permiten archivos de imagen.");
    }
    if (imageFiles.length === 0) return;
    const error = validatePhotos(imageFiles);
    if (error) {
      toast.error(error);
      return;
    }
    const nextPhotos = imageFiles.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setPhotos((current) => {
      const combined = [...current, ...nextPhotos].slice(0, 3);
      if (current.length + nextPhotos.length > 3) {
        toast.error("Solo puedes adjuntar hasta 3 fotos.");
      }
      const dropped = [...current, ...nextPhotos].slice(3);
      dropped.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      return combined;
    });
  };

  const removePhoto = (index: number) => {
    setFormTouched((current) => ({ ...current, fotos: true }));
    setPhotos((current) => {
      const target = current[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((_, currentIndex) => currentIndex !== index);
    });
  };

  const resetPhotos = () => {
    setPhotos((current) => {
      current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      return [];
    });
    setPhotoPreview(null);
  };

  const sendComment = (files: File[] = [], onSent?: () => void) => {
    if (!selected || !comment.trim()) return;
    const tag = commentTag === DEFAULT_TAG ? null : commentTag;
    startTransition(async () => {
      try {
        await lostFoundClient.comentar(selected.id, comment.trim(), replyingTo, files.length ? files : undefined, tag);
        setSelected(await lostFoundClient.detalle(selected.id));
        setComment("");
        setCommentTag(DEFAULT_TAG);
        setReplyingTo(null);
        onSent?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo publicar el comentario");
      }
    });
  };

  const reactComment = (id: string) => {
    if (!selected) return;
    startTransition(async () => {
      try {
        await lostFoundClient.reaccionarComentario(id);
        setSelected(await lostFoundClient.detalle(selected.id));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo registrar la reacción");
      }
    });
  };

  const pinComment = (id: string, fijar: boolean) => {
    if (!selected) return;
    startTransition(async () => {
      try {
        await lostFoundClient.fijarComentario(id, fijar);
        setSelected(await lostFoundClient.detalle(selected.id));
        toast.success(fijar ? "Comentario fijado" : "Comentario desfijado");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo fijar el comentario");
      }
    });
  };

  const respondMatch = (matchId: string, confirmar: boolean) => {
    startTransition(async () => {
      try {
        await lostFoundClient.responderMatch(matchId, confirmar);
        if (selected) {
          setSelected(await lostFoundClient.detalle(selected.id));
          setMatches(await lostFoundClient.matches(selected.id));
        }
        await refreshMine();
        toast.success(confirmar ? "Coincidencia confirmada" : "Coincidencia descartada");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo responder el match");
      }
    });
  };

  const cancelCase = () => {
    if (!selected) return;
    const observaciones = window.prompt("Motivo de cancelacion");
    if (!observaciones?.trim()) return;
    startTransition(async () => {
      try {
        const detail = await lostFoundClient.cancelar(selected.id, observaciones.trim());
        setSelected(detail);
        await refreshMine();
        void reloadFeed();
        toast.success("Caso cancelado");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo cancelar el caso");
      }
    });
  };

  const toggleParticipation = (checked: boolean) => {
    if (!selected) return;
    setThreadSubscribed(checked);
    startTransition(async () => {
      try {
        await lostFoundClient.actualizarParticipacion(selected.id, checked, checked);
        toast.success(checked ? "Notificaciones del hilo activadas" : "Hilo silenciado");
      } catch (error) {
        setThreadSubscribed(!checked);
        toast.error(error instanceof Error ? error.message : "No se pudo actualizar la participacion");
      }
    });
  };

  const isOwnSelected = Boolean(selected && mineIds.has(selected.id));
  const showDetailScreen = Boolean(selected) || openingDetail;
  const formErrors = useMemo(() => validateCaseFields(form, photos), [form, photos]);
  const metaError = useMemo(() => validateMetadatos(metadatoCampos, metadatos), [metadatoCampos, metadatos]);
  const canAddPhotos = photos.length < 3;

  // ── Vista de detalle a pantalla completa ──────────────────────────────────
  if (showDetailScreen) {
    return (
      <div className="px-2 py-4">
        <button
          type="button"
          onClick={closeDetail}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#001C55]"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al feed
        </button>

        {selected ? (
          <CaseDetail
            caso={selected}
            matches={matches}
            isOwn={isOwnSelected}
            canEdit={isOwnSelected}
            onEdit={() => setEditOpen(true)}
            threadSubscribed={threadSubscribed}
            comment={comment}
            commentTag={commentTag}
            onCommentTagChange={setCommentTag}
            loading={isPending}
            onClose={closeDetail}
            onCommentChange={setComment}
            replyingTo={replyingTo}
            onReply={setReplyingTo}
            onClearReply={() => setReplyingTo(null)}
            onSendComment={sendComment}
            onReactComment={reactComment}
            onPinComment={pinComment}
            onDeleteComment={(id) => {
              if (!selected) return;
              startTransition(async () => {
                try {
                  await lostFoundClient.eliminarComentario(id);
                  setSelected(await lostFoundClient.detalle(selected.id));
                  toast.success("Comentario eliminado");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "No se pudo eliminar el comentario");
                }
              });
            }}
            onRespondMatch={respondMatch}
            onCancel={cancelCase}
            onToggleParticipation={toggleParticipation}
          />
        ) : (
          <DetailSkeleton />
        )}

        {selected && isOwnSelected && (
          <EditCaseModal
            open={editOpen}
            onOpenChange={setEditOpen}
            caso={selected}
            categorias={categorias}
            ubicaciones={ubicacionesMaestras}
            onSaved={(saved) => setSelected(saved)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 py-5">
      <section className="space-y-2">
        <div className="flex items-center gap-2 text-[#001C55]">
          <PackageSearch className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Lost & Found</h1>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="recepciones">Recepciones</TabsTrigger>
          <TabsTrigger value="mis">Mis casos</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-3">
          {/* Nivel 1: búsqueda general + filtros avanzados */}
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={filters.search}
                onChange={(e) => patchFilters({ search: e.target.value })}
                placeholder="Buscar por objeto, lugar o marca"
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              className="relative gap-1.5"
              onClick={() => setFiltersOpen(true)}
              aria-label="Más filtros"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {advancedCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#001C55] px-1 text-[10px] font-semibold text-white">
                  {advancedCount}
                </span>
              )}
            </Button>
          </div>

          {/* Nivel 2: filtros rápidos */}
          <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
            <QuickChip active={isPristine} onClick={() => setFilters(emptyCommunityFilters)}>
              Todos
            </QuickChip>

            <Select
              value={filters.categoria_id || ALL_CATEGORIES}
              onValueChange={(value) =>
                patchFilters({ categoria_id: value === ALL_CATEGORIES ? "" : value, metadatos: {} })
              }
            >
              <SelectTrigger
                className={cn(
                  "h-9 w-auto gap-1 rounded-full border-slate-200 text-xs",
                  filters.categoria_id && "border-[#001C55] bg-[#001C55]/5 text-[#001C55]",
                )}
                aria-label="Filtrar por categoría"
              >
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORIES}>Categoría</SelectItem>
                {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filters.timePreset || "__any__"} onValueChange={(value) => patchFilters({ timePreset: value === "__any__" ? "" : value })}>
              <SelectTrigger
                className={cn(
                  "h-9 w-auto gap-1 rounded-full border-slate-200 text-xs",
                  filters.timePreset && "border-[#001C55] bg-[#001C55]/5 text-[#001C55]",
                )}
                aria-label="Filtrar por tiempo"
              >
                <Clock className="h-3.5 w-3.5" />
                <SelectValue placeholder="Tiempo" />
              </SelectTrigger>
              <SelectContent>
                {TIME_PRESETS.map((preset) => (
                  <SelectItem key={preset.value || "__any__"} value={preset.value || "__any__"}>{preset.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <QuickChip active={hasLocation} icon={<MapPin className="h-3.5 w-3.5" />} onClick={() => setLocationOpen(true)}>
              {hasLocation ? `Cerca · ${formatRadius(filters.radio_km! * 1000)}` : "Lugar"}
            </QuickChip>
          </div>

          {/* Nivel 3: hilos */}
          <FeedList
            items={feed}
            loading={feedLoading}
            loadingMore={loadingMore}
            nextCursor={nextCursor}
            onOpen={openDetail}
            onLoadMore={loadMore}
          />
        </TabsContent>

        <TabsContent value="recepciones" className="space-y-3">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={filters.search}
                onChange={(e) => patchFilters({ search: e.target.value })}
                placeholder="Buscar recepciones operativas"
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              className="relative gap-1.5"
              onClick={() => setFiltersOpen(true)}
              aria-label="Mas filtros"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {advancedCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#001C55] px-1 text-[10px] font-semibold text-white">
                  {advancedCount}
                </span>
              )}
            </Button>
          </div>

          <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
            <QuickChip active={isPristine} onClick={() => setFilters(emptyCommunityFilters)}>
              Todas
            </QuickChip>
            <Select
              value={filters.categoria_id || ALL_CATEGORIES}
              onValueChange={(value) =>
                patchFilters({ categoria_id: value === ALL_CATEGORIES ? "" : value, metadatos: {} })
              }
            >
              <SelectTrigger
                className={cn(
                  "h-9 w-auto gap-1 rounded-full border-slate-200 text-xs",
                  filters.categoria_id && "border-[#001C55] bg-[#001C55]/5 text-[#001C55]",
                )}
                aria-label="Filtrar por categoria"
              >
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORIES}>Categoria</SelectItem>
                {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
            <QuickChip active={hasLocation} icon={<MapPin className="h-3.5 w-3.5" />} onClick={() => setLocationOpen(true)}>
              {hasLocation ? `Cerca · ${formatRadius(filters.radio_km! * 1000)}` : "Lugar"}
            </QuickChip>
          </div>

          <FeedList
            items={operatorFeed}
            loading={operatorFeedLoading}
            loadingMore={false}
            nextCursor={null}
            onOpen={openDetail}
            onLoadMore={() => undefined}
          />
        </TabsContent>

        <TabsContent value="mis" className="space-y-3">
          <Select value={mineStatus} onValueChange={setMineStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos los estados</SelectItem>
              {["ABIERTO", "EN_REVISION", "CONFIRMADO", "EN_CUSTODIA", "DEVUELTO", "DESCARTADO", "CERRADO"].map((estado) => (
                <SelectItem key={estado} value={estado}>{estadoLabel(estado)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {mineLoading && !mineLoaded ? (
            <CaseListSkeleton />
          ) : filteredMine.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-slate-500">No tienes casos con ese estado.</p>
          ) : (
            <div className="space-y-3">
              {filteredMine.map((item) => <CaseCard key={item.id} item={item} onOpen={openDetail} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Botón flotante para registrar un nuevo caso (persiste entre tabs). */}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30">
        <div className="mx-auto max-w-md px-4">
          <Button
            onClick={() => {
              setNewCaseOpen(true);
              void loadUbicaciones();
            }}
            aria-label="Registrar nuevo caso"
            className="pointer-events-auto ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#001C55] p-0 shadow-lg shadow-[#001C55]/30 transition active:scale-95"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </div>

      <Drawer
        open={newCaseOpen}
        onOpenChange={(open) => {
          setNewCaseOpen(open);
          if (!open) {
            setFormTouched({});
            setFormSubmitted(false);
          }
        }}
      >
        <DrawerContent className="max-h-[92vh]">
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-hidden">
            <DrawerHeader className="text-left">
              <DrawerTitle>Registrar caso</DrawerTitle>
              <DrawerDescription>Publica un objeto perdido o encontrado para la comunidad.</DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
              <section className="space-y-3 rounded-lg border bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Informacion del hilo</p>
                <FieldBlock label="Tipo de hilo" required>
                  <Select value={form.tipo} onValueChange={(value) => setForm((f) => ({ ...f, tipo: value as "PERDIDO" | "ENCONTRADO" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERDIDO">Objeto perdido</SelectItem>
                      <SelectItem value="ENCONTRADO">Objeto encontrado</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldBlock>
                <FieldBlock label="Titulo" required>
                  <Input
                    placeholder="Ej. Mochila azul en biblioteca"
                    value={form.titulo}
                    maxLength={LF_TEXT_LIMITS.titulo.max}
                    aria-invalid={Boolean(visibleFormError(formErrors.titulo, formTouched.titulo, formSubmitted))}
                    onBlur={() => setFormTouched((current) => ({ ...current, titulo: true }))}
                    onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                  />
                  <CharCounter value={form.titulo} min={LF_TEXT_LIMITS.titulo.min} max={LF_TEXT_LIMITS.titulo.max} />
                  <FieldError message={visibleFormError(formErrors.titulo, formTouched.titulo, formSubmitted)} />
                </FieldBlock>
                <FieldBlock label="Descripcion" required>
                  <Textarea
                    placeholder="Describe rasgos, contenido visible, estado y detalles utiles para identificar el objeto."
                    value={form.descripcion}
                    rows={5}
                    maxLength={LF_TEXT_LIMITS.descripcion.max}
                    aria-invalid={Boolean(visibleFormError(formErrors.descripcion, formTouched.descripcion, formSubmitted))}
                    className="max-h-60 min-h-28 w-full resize-y overflow-x-hidden wrap-break-words field-sizing-fixed"
                    onBlur={() => setFormTouched((current) => ({ ...current, descripcion: true }))}
                    onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  />
                  <CharCounter value={form.descripcion} min={LF_TEXT_LIMITS.descripcion.min} max={LF_TEXT_LIMITS.descripcion.max} />
                  <FieldError message={visibleFormError(formErrors.descripcion, formTouched.descripcion, formSubmitted)} />
                </FieldBlock>
              </section>

              <section className="space-y-3 rounded-lg border bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categoria y detalles</p>
                <FieldBlock label="Categoria" required>
                  <Select
                    value={form.categoria_id || undefined}
                    onValueChange={(value) => {
                      setFormTouched((current) => ({ ...current, categoria_id: true, metadatos: true }));
                      setForm((f) => ({ ...f, categoria_id: value }));
                      setMetadatos({});
                    }}
                  >
                    <SelectTrigger aria-invalid={Boolean(visibleFormError(formErrors.categoria_id, formTouched.categoria_id, formSubmitted))}>
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>{categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                  <FieldError message={visibleFormError(formErrors.categoria_id, formTouched.categoria_id, formSubmitted)} />
                </FieldBlock>
                <MetadatoFields
                  campos={metadatoCampos}
                  values={metadatos}
                  onChange={(codigo, value) => {
                    setFormTouched((current) => ({ ...current, metadatos: true }));
                    setMetadatos((prev) => ({ ...prev, [codigo]: value }));
                  }}
                />
                <FieldError message={visibleFormError(metaError ?? undefined, formTouched.metadatos, formSubmitted)} />
              </section>

              <section className="space-y-3 rounded-lg border bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lugar y fecha</p>
                <FieldBlock label="Ubicacion" required>
                  <Select value={ubicacionSeleccionada} onValueChange={handleUbicacionChange}>
                    <SelectTrigger><SelectValue placeholder="Ubicacion" /></SelectTrigger>
                    <SelectContent>
                      {ubicacionesLoading && (
                        <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-500">
                          <Spinner className="h-3.5 w-3.5" />
                          Cargando ubicaciones...
                        </div>
                      )}
                      {ubicacionesMaestras.map((ubicacion) => <SelectItem key={ubicacion.id} value={ubicacion.id}>{ubicacion.nombre}</SelectItem>)}
                      <SelectItem value="OTRO">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldBlock>
                {ubicacionSeleccionada === "OTRO" && (
                  <FieldBlock label="Lugar de referencia" required>
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <Input
                        placeholder="Ej. Entrada principal, aula N-201"
                        value={form.lugar_referencia}
                        maxLength={LF_TEXT_LIMITS.lugar_referencia.max}
                        aria-invalid={Boolean(visibleFormError(formErrors.lugar_referencia, formTouched.lugar_referencia, formSubmitted))}
                        onBlur={() => setFormTouched((current) => ({ ...current, lugar_referencia: true }))}
                        onChange={(e) => setForm((f) => ({ ...f, lugar_referencia: e.target.value }))}
                      />
                      <Button type="button" variant="outline" size="icon" onClick={openMapDialog} aria-label="Seleccionar ubicacion exacta">
                        <MapPin className="h-4 w-4" />
                      </Button>
                    </div>
                    <CharCounter value={form.lugar_referencia} min={LF_TEXT_LIMITS.lugar_referencia.min} max={LF_TEXT_LIMITS.lugar_referencia.max} />
                    {form.latitud != null && form.longitud != null && (
                      <p className="text-[11px] text-slate-500">
                        Coordenadas: {form.latitud.toFixed(6)}, {form.longitud.toFixed(6)}
                      </p>
                    )}
                    <FieldError message={visibleFormError(formErrors.lugar_referencia, formTouched.lugar_referencia, formSubmitted)} />
                  </FieldBlock>
                )}
                {ubicacionSeleccionada !== "OTRO" && (
                  <FieldError message={visibleFormError(formErrors.lugar_referencia, formTouched.lugar_referencia, formSubmitted)} />
                )}
                <FieldBlock label="Fecha y hora" required>
                  <Input
                    type="datetime-local"
                    value={toLocalInput(form.fecha_evento)}
                    aria-invalid={Boolean(visibleFormError(formErrors.fecha_evento, formTouched.fecha_evento, formSubmitted))}
                    onBlur={() => setFormTouched((current) => ({ ...current, fecha_evento: true }))}
                    onChange={(e) => setForm((f) => ({ ...f, fecha_evento: fromLimaDateTimeInputValue(e.target.value) }))}
                  />
                  <FieldError message={visibleFormError(formErrors.fecha_evento, formTouched.fecha_evento, formSubmitted)} />
                </FieldBlock>
              </section>

              <section className="space-y-3 rounded-lg border bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Datos adicionales</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FieldBlock label="Marca">
                    <Input
                      placeholder="Opcional"
                      value={form.marca ?? ""}
                      maxLength={LF_TEXT_LIMITS.marca.max}
                      onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))}
                    />
                    <CharCounter value={form.marca ?? ""} max={LF_TEXT_LIMITS.marca.max} />
                  </FieldBlock>
                  <FieldBlock label="Color principal">
                    <Input
                      placeholder="Opcional"
                      value={form.color_principal ?? ""}
                      maxLength={LF_TEXT_LIMITS.color_principal.max}
                      onChange={(e) => setForm((f) => ({ ...f, color_principal: e.target.value }))}
                    />
                    <CharCounter value={form.color_principal ?? ""} max={LF_TEXT_LIMITS.color_principal.max} />
                  </FieldBlock>
                </div>
                <FieldBlock label="Etiquetas">
                  <Input
                    placeholder="Ej. llaves, azul, biblioteca"
                    value={tagInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTagInput(value);
                      setForm((f) => ({ ...f, etiquetas: parseEtiquetas(value) }));
                    }}
                  />
                  <p className="text-[11px] text-slate-500">Separa cada etiqueta con coma.</p>
                </FieldBlock>
              </section>

              <section className="space-y-3 rounded-lg border bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Imagenes</p>
                    <p className="mt-1 text-xs text-slate-500">Puedes tomar una foto con la camara del celular o elegir imagenes guardadas.</p>
                  </div>
                  <Badge variant="outline">{photos.length}/3</Badge>
                </div>
                <Label className={cn(
                  "flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-slate-50 px-3 text-center text-sm text-slate-600",
                  !canAddPhotos && "cursor-not-allowed opacity-60",
                )}>
                  <ImagePlus className="h-5 w-5 text-[#001C55]" />
                  {canAddPhotos ? "Agregar foto principal y hasta 2 adicionales" : "Ya agregaste el maximo de 3 fotos"}
                  <Input
                    className="hidden"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,image/gif"
                    multiple
                    capture="environment"
                    disabled={!canAddPhotos}
                    onChange={(e) => {
                      handlePhotos(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </Label>
                <FieldError message={visibleFormError(formErrors.fotos, formTouched.fotos, formSubmitted)} />
                {photos.length > 0 && (
                  <div className="grid grid-cols-1 gap-2">
                    {photos.map((photo, index) => (
                      <CommunityPhotoPreview
                        key={`${photo.file.name}-${index}`}
                        photo={photo}
                        onPreview={() => setPhotoPreview(photo)}
                        onRemove={() => removePhoto(index)}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
            <DrawerFooter>
              <Button className="w-full" onClick={createCase} disabled={isPending}>Publicar caso</Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      <Dialog open={Boolean(photoPreview)} onOpenChange={(open) => !open && setPhotoPreview(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-lg p-0 sm:max-w-md">
          <DialogHeader className="border-b px-4 py-3 text-left">
            <DialogTitle className="text-sm">{photoPreview?.file.name ?? "Vista previa"}</DialogTitle>
          </DialogHeader>
          {photoPreview && (
            <div className="bg-slate-50 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoPreview.previewUrl} alt={photoPreview.file.name} className="max-h-[72vh] w-full rounded object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-lg sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Seleccionar ubicacion exacta</DialogTitle>
            <DialogDescription>
              Toca el mapa para marcar donde se perdio o encontro el objeto.
            </DialogDescription>
          </DialogHeader>
          <LeafletCoordinatePicker
            lat={mapDraft?.lat ?? null}
            lng={mapDraft?.lng ?? null}
            mapClassName="h-[58vh]"
            showHelperText={false}
            onChange={(lat, lng) => setMapDraft({ lat, lng })}
          />
          <p className="text-xs text-slate-500">
            Coordenada seleccionada: {mapDraft?.lat.toFixed(6) ?? "-"}, {mapDraft?.lng.toFixed(6) ?? "-"}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setMapDialogOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={applyMapCoordinates}>Guardar ubicacion</Button>
          </div>
        </DialogContent>
      </Dialog>

      <LostFoundFeedFilters
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        categorias={categorias}
        onApply={setFilters}
      />
      <LostFoundLocationPicker
        open={locationOpen}
        onOpenChange={setLocationOpen}
        value={hasLocation ? { lat: filters.lat!, lng: filters.lng!, radio_km: filters.radio_km! } : null}
        onApply={applyLocation}
      />
    </div>
  );
}

function FieldBlock({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-2 text-xs font-medium text-slate-700">
        {label}
        {required && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">Requerido</span>}
      </Label>
      {children}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs font-medium text-rose-600">{message}</p>;
}

function visibleFormError(message: string | undefined, touched?: boolean, submitted?: boolean) {
  return touched || submitted ? message : undefined;
}

function CommunityPhotoPreview({
  photo,
  onPreview,
  onRemove,
}: {
  photo: FotoAdjunta;
  onPreview: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[72px_1fr_auto] items-center gap-3 rounded-lg border bg-slate-50 p-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.previewUrl} alt={photo.file.name} className="h-16 w-16 rounded-md object-cover" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-800">{photo.file.name}</p>
        <p className="text-xs text-slate-500">{formatBytes(photo.file.size)}</p>
      </div>
      <div className="flex gap-1">
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={onPreview} aria-label="Previsualizar imagen">
          <Eye className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={onRemove} aria-label="Eliminar imagen">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function QuickChip({
  active,
  icon,
  onClick,
  children,
}: {
  active?: boolean;
  icon?: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition",
        active ? "border-[#001C55] bg-[#001C55] text-white" : "border-slate-200 bg-white text-slate-600",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function FeedList({
  items,
  loading,
  loadingMore,
  nextCursor,
  onOpen,
  onLoadMore,
}: {
  items: CasoLfListItem[];
  loading: boolean;
  loadingMore: boolean;
  nextCursor: string | null;
  onOpen: (item: CasoLfListItem) => void;
  onLoadMore: () => void;
}) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !nextCursor) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: "240px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [nextCursor, onLoadMore]);

  if (loading) return <CaseListSkeleton />;
  if (!items.length) {
    return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">No hay casos para los filtros seleccionados.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => <CaseCard key={item.id} item={item} onOpen={onOpen} />)}
      {nextCursor && (
        <div ref={sentinelRef} className="pt-1">
          {loadingMore ? (
            <CaseCardSkeleton />
          ) : (
            <Button variant="outline" className="w-full" onClick={onLoadMore}>
              <ChevronDown className="mr-2 h-4 w-4" /> Cargar más
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="h-6 w-2/3 animate-pulse rounded bg-slate-200" />
        <div className="aspect-video w-full animate-pulse rounded-lg bg-slate-200" />
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="flex gap-2">
          <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200" />
        </div>
      </CardContent>
    </Card>
  );
}

function CaseDetail(props: {
  caso: CasoLfDetail;
  matches: MatchLf[];
  isOwn: boolean;
  canEdit?: boolean;
  onEdit?: () => void;
  threadSubscribed: boolean;
  comment: string;
  commentTag: string;
  onCommentTagChange: (value: string) => void;
  replyingTo: string | null;
  loading: boolean;
  onClose: () => void;
  onCommentChange: (value: string) => void;
  onReply: (id: string) => void;
  onClearReply: () => void;
  onSendComment: (files: File[], onSuccess: () => void) => void;
  onReactComment: (id: string) => void;
  onPinComment: (id: string, fijar: boolean) => void;
  onDeleteComment: (id: string) => void;
  onRespondMatch: (matchId: string, confirmar: boolean) => void;
  onCancel: () => void;
  onToggleParticipation: (checked: boolean) => void;
}) {
  const { caso, matches, isOwn, canEdit, onEdit, threadSubscribed, comment, commentTag, onCommentTagChange, replyingTo, loading, onCommentChange, onReply, onClearReply, onSendComment, onReactComment, onPinComment, onDeleteComment, onRespondMatch, onCancel, onToggleParticipation } = props;
  const chatEnabled = caso.comentarios_habilitados !== false;
  const canComment = chatEnabled && commentableStates.has(caso.estado);
  const canCancel = isOwn && !terminalStates.has(caso.estado);
  const [commentSort, setCommentSort] = useState<CommentSort>("recientes");
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [menuComment, setMenuComment] = useState<CasoLfDetail["comentarios"][number] | null>(null);
  const [commentPhotos, setCommentPhotos] = useState<FotoAdjunta[]>([]);
  const commentFileRef = useRef<HTMLInputElement | null>(null);
  const commentPhotosRef = useRef<FotoAdjunta[]>([]);
  const fotoAdicionalUrls = useMemo(() => caso.foto_adicional_urls ?? [], [caso.foto_adicional_urls]);
  const comentarios = useMemo(() => caso.comentarios ?? [], [caso.comentarios]);
  const historial = useMemo(() => caso.historial ?? [], [caso.historial]);
  const galleryImages = useMemo(
    () => [caso.foto_url, ...fotoAdicionalUrls].filter((src): src is string => Boolean(src)),
    [caso.foto_url, fotoAdicionalUrls],
  );
  const maxDepth = caso.comentarios_profundidad_maxima ?? 6;
  const childrenMap = useMemo(() => buildCommentChildrenMap(comentarios), [comentarios]);

  useEffect(() => {
    commentPhotosRef.current = commentPhotos;
  }, [commentPhotos]);
  useEffect(() => () => commentPhotosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl)), []);

  const addCommentPhotos = (fileList: FileList | null) => {
    const chosen = Array.from(fileList ?? []);
    const images = chosen.filter((file) => file.type.startsWith("image/"));
    if (images.length !== chosen.length) toast.error("Solo se permiten archivos de imagen.");
    if (images.length === 0) return;
    setCommentPhotos((current) => {
      const combined = [...current, ...images.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))];
      if (combined.length > 3) toast.error("Solo puedes adjuntar hasta 3 imagenes.");
      combined.slice(3).forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      return combined.slice(0, 3);
    });
  };

  const removeCommentPhoto = (index: number) => {
    setCommentPhotos((current) => {
      const target = current[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((_, idx) => idx !== index);
    });
  };

  const handleSendComment = () => {
    onSendComment(commentPhotos.map((photo) => photo.file), () => {
      commentPhotosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      setCommentPhotos([]);
    });
  };
  const commentTags = tagsForTipo(caso.tipo);
  const commentIds = new Set(comentarios.map((comentario) => comentario.id));
  // Raíz = sin padre, o cuyo padre ya no es visible (huérfano), igual que en la web de gestión.
  const rawRoots = comentarios.filter((comentario) => !comentario.parent_id || !commentIds.has(comentario.parent_id));
  const rootComments = sortRootComments(filterByTags(rawRoots, tagFilters), commentSort);
  const replyingComment = replyingTo ? comentarios.find((item) => item.id === replyingTo) : null;
  const hasHistory = isOwn && historial.length > 0;
  return (
    <>
    <Card>
      <CardHeader className="px-3 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{caso.titulo}</CardTitle>
            <p className="text-xs text-slate-500">{caso.codigo} · {caso.lugar_referencia}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {hasHistory && (
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9"
                onClick={() => setHistoryOpen(true)}
                aria-label="Ver historial"
                title="Historial"
              >
                <History className="h-4 w-4" />
              </Button>
            )}
            {canEdit && onEdit && (
              <Button size="icon" variant="outline" className="h-9 w-9" onClick={onEdit} aria-label="Editar caso" title="Editar">
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {canCancel && (
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={onCancel}
                disabled={loading}
                aria-label="Cancelar mi caso"
                title="Cancelar mi caso"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-3">
        {galleryImages.length > 0 && (
          <>
            {caso.foto_url && (
              <Photo src={caso.foto_url} onClick={() => setLightbox({ images: galleryImages, index: galleryImages.indexOf(caso.foto_url!) })} />
            )}
            {fotoAdicionalUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {fotoAdicionalUrls.map((src) => (
                  <Photo key={src} src={src} small onClick={() => setLightbox({ images: galleryImages, index: galleryImages.indexOf(src) })} />
                ))}
              </div>
            )}
          </>
        )}
        <p className="text-sm text-slate-700">{caso.descripcion}</p>
        <div className="flex flex-wrap gap-2">
          <EstadoLfBadge estado={caso.estado} />
          <Badge variant="secondary">{tipoLabel(caso.tipo)}</Badge>
          {caso.categoria_nombre && <Badge variant="secondary">{caso.categoria_nombre}</Badge>}
          {caso.reportante && <Badge variant="outline">Reporta {caso.reportante.nombre_completo}</Badge>}
        </div>

        {caso.estado === "CONFIRMADO" && isOwn && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
            <PackageCheck className="mb-1 h-4 w-4" />
            Coincidencia confirmada. Un operador coordinara la custodia y devolucion del objeto.
          </div>
        )}

        {matches.length > 0 && isOwn && (
          <section className="space-y-2">
            <Label>Coincidencias sugeridas</Label>
            {matches.map((match) => (
              <div key={match.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{match.caso_contraparte?.titulo ?? "Caso relacionado"}</p>
                    <p className="text-slate-500">Afinidad {(match.score_total * 100).toFixed(0)}% · {estadoLabel(match.estado)}</p>
                  </div>
                  {match.estado === "SUGERIDO" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => onRespondMatch(match.id, true)} disabled={loading}><Check className="mr-1 h-4 w-4" />Confirmar</Button>
                      <Button size="sm" variant="outline" onClick={() => onRespondMatch(match.id, false)} disabled={loading}>Descartar</Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        {chatEnabled && (
          <>
        <Separator />

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label className="flex items-center gap-1"><MessageSquare className="h-4 w-4" />Chat comunitario</Label>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {threadSubscribed ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
              <Switch checked={threadSubscribed} onCheckedChange={onToggleParticipation} />
            </div>
          </div>
          {rawRoots.length > 0 && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <MultiSelectFilter
                className="w-full sm:w-56"
                placeholder="Filtrar por etiqueta"
                options={commentTags.map((t) => ({ value: t.value, label: t.label }))}
                selected={tagFilters}
                onChange={setTagFilters}
              />
              <Select value={commentSort} onValueChange={(value) => setCommentSort(value as CommentSort)}>
                <SelectTrigger className="w-full sm:w-44" aria-label="Ordenar comentarios">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMENT_SORT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            {rawRoots.length === 0 ? (
              <p className="rounded-lg border border-dashed p-3 text-sm text-slate-500">Sin comentarios aun.</p>
            ) : rootComments.length === 0 ? (
              <p className="rounded-lg border border-dashed p-3 text-sm text-slate-500">No hay comentarios con la etiqueta seleccionada.</p>
            ) : rootComments.map((c) => (
              <CommunityCommentNode
                key={c.id}
                comment={c}
                childrenMap={childrenMap}
                depth={0}
                maxDepth={maxDepth}
                canComment={canComment}
                onReply={onReply}
                onReact={onReactComment}
                onOpenMenu={setMenuComment}
                onOpenImages={(images, index) => setLightbox({ images, index })}
              />
            ))}
          </div>
          {replyingComment && (
            <div className="flex items-center justify-between rounded-lg bg-[#001C55]/5 px-3 py-2 text-xs text-[#001C55]">
              <span>Respondiendo a {replyingComment.autor?.nombre_completo ?? "comentario"}</span>
              <Button size="sm" variant="ghost" onClick={onClearReply}>Cancelar</Button>
            </div>
          )}
          <div className="space-y-2">
            {canComment && (
              <Select value={commentTag} onValueChange={onCommentTagChange}>
                <SelectTrigger className="w-full" aria-label="Etiqueta del comentario">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {commentTags.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {commentPhotos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {commentPhotos.map((photo, index) => (
                  <div key={photo.previewUrl} className="relative h-16 w-16 overflow-hidden rounded-md border bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeCommentPhoto(index)}
                      className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                      aria-label="Quitar imagen"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              {canComment && (
                <>
                  <input
                    ref={commentFileRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,image/gif"
                    multiple
                    hidden
                    onChange={(e) => {
                      addCommentPhotos(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => commentFileRef.current?.click()}
                    disabled={loading || commentPhotos.length >= 3}
                    aria-label="Adjuntar imagen o tomar foto"
                    title="Adjuntar imagen o tomar foto"
                  >
                    <ImagePlus className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Input
                value={comment}
                onChange={(e) => onCommentChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && comment.trim() && canComment && !loading) {
                    e.preventDefault();
                    handleSendComment();
                  }
                }}
                placeholder={canComment ? "Escribe un comentario" : "Chat en solo lectura"}
                disabled={!canComment}
              />
              <Button
                size="icon"
                className="shrink-0"
                onClick={handleSendComment}
                disabled={loading || !canComment || !comment.trim()}
                aria-label="Enviar comentario"
                title="Enviar"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
          </>
        )}
      </CardContent>
    </Card>

    {/* Historial en modal para no saturar la vista principal. */}
    <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
      <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-1.5 text-base">
            <History className="h-4 w-4" />Historial
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {historial.map((item) => (
            <div key={item.id} className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
              <p className="font-medium text-slate-800">{estadoLabel(item.estado_nuevo)} · {item.accion}</p>
              <p>{formatDate(item.created_at)}{item.comentario ? ` · ${item.comentario}` : ""}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>

    {/* Lightbox de imagenes: ampliar tocando cualquier foto del hilo o de un comentario. */}
    <ImageLightbox
      images={lightbox?.images ?? []}
      index={lightbox?.index ?? null}
      onIndexChange={(index) => setLightbox((current) => (current ? { ...current, index } : current))}
      onClose={() => setLightbox(null)}
    />

    {/* Menu contextual de comentario (mantener presionado, estilo Instagram). */}
    <CommentContextMenu
      comment={menuComment}
      onClose={() => setMenuComment(null)}
      onPin={onPinComment}
      onDelete={onDeleteComment}
    />
    </>
  );
}

function ImageLightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: string[];
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const open = index !== null && index >= 0 && index < images.length;
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-[calc(100vw-1rem)] border-0 bg-transparent p-0 shadow-none sm:max-w-2xl">
        <DialogTitle className="sr-only">Imagen ampliada</DialogTitle>
        {open && (
          <div className="relative flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[index]} alt="" className="max-h-[80vh] w-full rounded-lg object-contain" />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => onIndexChange((index - 1 + images.length) % images.length)}
                  className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white"
                  aria-label="Imagen anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => onIndexChange((index + 1) % images.length)}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white"
                  aria-label="Imagen siguiente"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-2.5 py-0.5 text-xs font-medium text-white">
                  {index + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CommentContextMenu({
  comment,
  onClose,
  onPin,
  onDelete,
}: {
  comment: CasoLfDetail["comentarios"][number] | null;
  onClose: () => void;
  onPin: (id: string, fijar: boolean) => void;
  onDelete: (id: string) => void;
}) {
  if (!comment) return null;
  const canPin = comment.puede_fijar;
  const canDelete = comment.puede_eliminar;
  return (
    <div
      className="animate-in fade-in-0 fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/40 p-6 backdrop-blur-sm duration-200"
      onClick={onClose}
      role="presentation"
    >
      <div className="animate-in zoom-in-95 fade-in-0 w-full max-w-sm rounded-2xl bg-white p-3 shadow-2xl duration-200" onClick={(e) => e.stopPropagation()}>
        <CommentAuthorLine comment={comment} />
        <p className="mt-2 whitespace-pre-wrap wrap-break-word text-sm text-slate-700">{comment.contenido}</p>
      </div>
      {(canPin || canDelete) ? (
        <div className="animate-in zoom-in-95 fade-in-0 w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl delay-75 duration-200" onClick={(e) => e.stopPropagation()}>
          {canPin && (
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 active:bg-slate-100"
              onClick={() => {
                onPin(comment.id, !comment.fijado);
                onClose();
              }}
            >
              {comment.fijado ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              {comment.fijado ? "Quitar fijado" : "Fijar comentario"}
            </button>
          )}
          {canPin && canDelete && <Separator />}
          {canDelete && (
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-rose-600 active:bg-rose-50"
              onClick={() => {
                onDelete(comment.id);
                onClose();
              }}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar comentario
            </button>
          )}
        </div>
      ) : (
        <p className="text-xs text-white/80">No tienes acciones disponibles para este comentario.</p>
      )}
    </div>
  );
}

function CommentAuthorLine({ comment }: { comment: CasoLfDetail["comentarios"][number] }) {
  return (
    <div className="flex items-center gap-2">
      <UserCircle2 className="h-7 w-7 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight text-slate-800">
          {comment.autor?.nombre_completo ?? "Usuario"}{comment.autor?.rol ? ` · ${comment.autor.rol}` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          {comment.fijado && (
            <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700"><Pin className="mr-1 h-3 w-3" />Fijado</Badge>
          )}
          <CommentTagBadge tag={comment.tag} />
        </div>
      </div>
    </div>
  );
}

// Mantener presionado (o clic derecho) para abrir el menu contextual del comentario.
function useLongPress(onLongPress: () => void, ms = 450) {
  const timer = useRef<number | null>(null);
  const clear = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);
  useEffect(() => clear, [clear]);
  return {
    onTouchStart: () => {
      clear();
      timer.current = window.setTimeout(onLongPress, ms);
    },
    onTouchEnd: clear,
    onTouchMove: clear,
    onTouchCancel: clear,
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      onLongPress();
    },
  };
}

function CommentTagBadge({ tag }: { tag?: string | null }) {
  if (!tag || tag === DEFAULT_TAG) return null;
  const meta = tagMeta(tag);
  return <Badge variant="outline" className={cn("ml-1", meta.badgeClassName)}>{meta.label}</Badge>;
}

function buildCommentChildrenMap(comentarios: CasoLfDetail["comentarios"]): Map<string, CasoLfDetail["comentarios"]> {
  const map = new Map<string, CasoLfDetail["comentarios"]>();
  for (const comentario of comentarios) {
    if (!comentario.parent_id) continue;
    const list = map.get(comentario.parent_id) ?? [];
    list.push(comentario);
    map.set(comentario.parent_id, list);
  }
  return map;
}

// Nodo recursivo: misma profundidad que la web de gestión (caso.comentarios_profundidad_maxima).
function CommunityCommentNode({
  comment,
  childrenMap,
  depth,
  maxDepth,
  canComment,
  onReply,
  onReact,
  onOpenMenu,
  onOpenImages,
}: {
  comment: CasoLfDetail["comentarios"][number];
  childrenMap: Map<string, CasoLfDetail["comentarios"]>;
  depth: number;
  maxDepth: number;
  canComment: boolean;
  onReply: (id: string) => void;
  onReact: (id: string) => void;
  onOpenMenu: (comment: CasoLfDetail["comentarios"][number]) => void;
  onOpenImages: (images: string[], index: number) => void;
}) {
  const replies = childrenMap.get(comment.id) ?? [];
  // Al abrir el hilo, las respuestas de nivel 1 se muestran; las más profundas quedan contraídas.
  const [repliesOpen, setRepliesOpen] = useState(depth === 0);
  const canReply = canComment && depth + 1 < maxDepth;
  const hasContextActions = Boolean(comment.puede_fijar || comment.puede_eliminar);
  const longPress = useLongPress(() => onOpenMenu(comment));
  const images = comment.imagenes ?? [];
  return (
    <div className={cn("space-y-2", depth > 0 && "border-l border-slate-200 pl-3")}>
      <div
        className={cn(
          "select-none rounded-lg p-2.5 text-sm transition-colors active:bg-slate-100",
          depth > 0 ? "bg-white shadow-sm ring-1 ring-slate-100" : "bg-slate-50",
          comment.fijado && "ring-1 ring-sky-200",
        )}
        {...(hasContextActions ? longPress : {})}
      >
        <CommentAuthorLine comment={comment} />
        <p className="mt-1.5 whitespace-pre-wrap wrap-break-word">{comment.contenido}</p>
        {images.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {images.map((src, index) => (
              <button
                key={src}
                type="button"
                onClick={() => onOpenImages(images, index)}
                className="relative h-20 w-20 overflow-hidden rounded-md border bg-slate-50"
                aria-label="Ampliar imagen"
              >
                <Image src={src} alt="" fill unoptimized className="object-cover" />
              </button>
            ))}
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {canReply && <Button size="sm" variant="ghost" onClick={() => onReply(comment.id)}>Responder</Button>}
          <Button
            size="sm"
            variant={comment.reaccionado ? "secondary" : "ghost"}
            onClick={() => onReact(comment.id)}
            disabled={!comment.puede_reaccionar}
            title={comment.puede_reaccionar ? "Destacar" : "No puedes destacar este comentario"}
          >
            <Star className={cn("mr-1 h-4 w-4", comment.reaccionado && "fill-amber-400 text-amber-500")} />
            {comment.destacados ? comment.destacados : "Destacar"}
          </Button>
        </div>
      </div>
      {replies.length > 0 && (
        <div className="space-y-2">
          <Button size="sm" variant="ghost" className="text-slate-600" onClick={() => setRepliesOpen((v) => !v)}>
            {repliesOpen ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}
            {repliesOpen ? "Ocultar respuestas" : `Mostrar ${replies.length} respuesta${replies.length > 1 ? "s" : ""}`}
          </Button>
          {repliesOpen && replies.map((child) => (
            <CommunityCommentNode
              key={child.id}
              comment={child}
              childrenMap={childrenMap}
              depth={depth + 1}
              maxDepth={maxDepth}
              canComment={canComment}
              onReply={onReply}
              onReact={onReact}
              onOpenMenu={onOpenMenu}
              onOpenImages={onOpenImages}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Photo({ src, small = false, onClick }: { src: string; small?: boolean; onClick?: () => void }) {
  const content = <Image src={src} alt="" fill unoptimized className="object-cover" />;
  const baseClass = cn("relative w-full overflow-hidden bg-slate-100", small ? "aspect-square rounded-md" : "aspect-video");
  if (!onClick) {
    return <div className={baseClass}>{content}</div>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(baseClass, "cursor-zoom-in transition active:scale-[0.99]")}
      aria-label="Ampliar imagen"
    >
      {content}
    </button>
  );
}

function normalizeCreateForm(form: CasoLfCreatePayload): CasoLfCreatePayload {
  return {
    ...form,
    fecha_evento: fromLimaDateTimeInputValue(toLocalInput(form.fecha_evento)),
    etiquetas: Array.isArray(form.etiquetas) ? form.etiquetas : parseEtiquetas(String(form.etiquetas ?? "")),
  };
}

function parseEtiquetas(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function etiquetasToInput(value: CasoLfCreatePayload["etiquetas"]): string {
  return Array.isArray(value) ? value.join(", ") : String(value ?? "");
}

function validateCase(form: CasoLfCreatePayload, photos: FotoAdjunta[]) {
  const errors = validateCaseFields(form, photos);
  return errors.titulo ?? errors.descripcion ?? errors.categoria_id ?? errors.lugar_referencia ?? errors.fecha_evento ?? errors.fotos ?? "";
}

function validateCaseFields(form: CasoLfCreatePayload, photos: FotoAdjunta[]): CommunityFormErrors {
  const errors: CommunityFormErrors = {};
  const titleLength = form.titulo.trim().length;
  const descriptionLength = form.descripcion.trim().length;
  const placeLength = form.lugar_referencia.trim().length;
  if (titleLength < LF_TEXT_LIMITS.titulo.min || form.titulo.length > LF_TEXT_LIMITS.titulo.max) {
    errors.titulo = `El titulo debe tener entre ${LF_TEXT_LIMITS.titulo.min} y ${LF_TEXT_LIMITS.titulo.max} caracteres.`;
  }
  if (descriptionLength < LF_TEXT_LIMITS.descripcion.min || form.descripcion.length > LF_TEXT_LIMITS.descripcion.max) {
    errors.descripcion = `La descripcion debe tener entre ${LF_TEXT_LIMITS.descripcion.min} y ${LF_TEXT_LIMITS.descripcion.max} caracteres.`;
  }
  if (!form.categoria_id) errors.categoria_id = "Selecciona una categoria.";
  if (placeLength < LF_TEXT_LIMITS.lugar_referencia.min || form.lugar_referencia.length > LF_TEXT_LIMITS.lugar_referencia.max) {
    errors.lugar_referencia = `El lugar debe tener entre ${LF_TEXT_LIMITS.lugar_referencia.min} y ${LF_TEXT_LIMITS.lugar_referencia.max} caracteres.`;
  }
  const eventDate = new Date(form.fecha_evento);
  const now = new Date();
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(now.getDate() - 90);
  if (Number.isNaN(eventDate.getTime())) errors.fecha_evento = "Selecciona una fecha valida.";
  else if (eventDate > now) errors.fecha_evento = "La fecha no puede ser futura.";
  else if (eventDate < ninetyDaysAgo) errors.fecha_evento = "La fecha no puede ser anterior a 90 dias.";
  const photoError = validatePhotos(photos.map((photo) => photo.file), true);
  if (photoError) errors.fotos = photoError;
  return errors;
}

function validatePhotos(files: File[], required = false) {
  if (required && files.length === 0) return "Agrega al menos una foto.";
  if (files.length > 3) return "Solo puedes adjuntar hasta 3 fotos.";
  for (const file of files) {
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif", "image/gif"].includes(file.type)) {
      return "Solo se aceptan imagenes JPG, PNG, WEBP, HEIC o GIF.";
    }
    if (file.size < 50 * 1024) return "Cada imagen debe pesar al menos 50 KB.";
    if (file.size > 10 * 1024 * 1024) return "Cada imagen debe pesar como maximo 10 MB.";
  }
  return "";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function toLocalInput(value: string) {
  return toLimaDateTimeInputValue(value);
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  return formatLimaDateTime(value, { day: "2-digit", month: "short", year: "numeric" }, "Sin fecha");
}

function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "default") return;
  Notification.requestPermission().catch(() => undefined);
}
