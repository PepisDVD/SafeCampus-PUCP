"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Badge,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
  ToggleGroup,
  ToggleGroupItem,
} from "@safecampus/ui-kit";
import { Eye, Grid2X2, List, MapPin, MessageSquare, PackageSearch, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { lostFoundClient, type CasoLfCreatePayload } from "../client";
import { estadoLabel, estadoLfTone, tipoLabel } from "../presentation";
import type { CasoLfListItem, CategoriaLf, UbicacionMaestra } from "../types";

type Props = {
  initialCasos: CasoLfListItem[];
  initialNextCursor?: string | null;
  categorias: CategoriaLf[];
  ubicaciones: UbicacionMaestra[];
};

type FotoAdjunta = {
  file: File;
  previewUrl: string;
};

type FormErrors = Partial<Record<"titulo" | "descripcion" | "categoria_id" | "lugar_referencia" | "fecha_evento" | "fotos", string>>;
type TouchedFields = Partial<Record<keyof FormErrors, boolean>>;

const PAGE_SIZE = 12;
const DEFAULT_MAP_POINT = { lat: -12.06945, lng: -77.08055 };

const LeafletCoordinatePicker = dynamic(
  () => import("@/features/admin/components/maestros/leaflet-coordinate-picker").then((mod) => mod.LeafletCoordinatePicker),
  { ssr: false },
);

const emptyForm: CasoLfCreatePayload = {
  tipo: "ENCONTRADO",
  titulo: "",
  descripcion: "",
  categoria_id: "",
  lugar_referencia: "",
  fecha_evento: new Date().toISOString(),
  color_principal: "",
  marca: "",
  etiquetas: [],
};

export function LostFoundThreads({ initialCasos, initialNextCursor, categorias, ubicaciones }: Props) {
  const router = useRouter();
  const [casos, setCasos] = useState(initialCasos);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor ?? null);
  const [query, setQuery] = useState("");
  const [tipo, setTipo] = useState("TODOS");
  const [estado, setEstado] = useState("TODOS");
  const [categoria, setCategoria] = useState("TODAS");
  const [columns, setColumns] = useState("4");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CasoLfCreatePayload>(emptyForm);
  const [touched, setTouched] = useState<TouchedFields>({});
  const [submitted, setSubmitted] = useState(false);
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState("OTRO");
  const [fotos, setFotos] = useState<FotoAdjunta[]>([]);
  const [previewSeleccionado, setPreviewSeleccionado] = useState<FotoAdjunta | null>(null);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [mapConfirmOpen, setMapConfirmOpen] = useState(false);
  const [mapDraft, setMapDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [isPending, startTransition] = useTransition();
  const fotosRef = useRef<FotoAdjunta[]>([]);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const formErrors = useMemo(() => validateCase(form, fotos.length), [form, fotos.length]);
  const canSubmit = Object.keys(formErrors).length === 0;

  const threadParams = useCallback((cursor?: string | null) => ({
    limit: String(PAGE_SIZE),
    ...(query.trim() ? { search: query.trim() } : {}),
    ...(tipo !== "TODOS" ? { tipo } : {}),
    ...(estado !== "TODOS" ? { estado } : {}),
    ...(categoria !== "TODAS" ? { categoria_id: categoria } : {}),
    ...(cursor ? { cursor } : {}),
  }), [categoria, estado, query, tipo]);

  const loadMore = useCallback(() => {
    if (!nextCursor || isPending) return;
    startTransition(async () => {
      const response = await lostFoundClient.casosOperativo(threadParams(nextCursor));
      setCasos((current) => {
        const seen = new Set(current.map((caso) => caso.id));
        return [...current, ...response.items.filter((caso) => !seen.has(caso.id))];
      });
      setNextCursor(response.next_cursor ?? null);
    });
  }, [isPending, nextCursor, threadParams]);

  useEffect(() => {
    fotosRef.current = fotos;
  }, [fotos]);

  useEffect(() => {
    return () => {
      fotosRef.current.forEach((foto) => URL.revokeObjectURL(foto.previewUrl));
    };
  }, []);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !nextCursor) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore();
    }, { rootMargin: "280px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, nextCursor]);

  const handleUbicacionChange = (value: string) => {
    setTouched((current) => ({ ...current, lugar_referencia: true }));
    setUbicacionSeleccionada(value);
    if (value === "OTRO") {
      setForm((current) => ({ ...current, lugar_referencia: "" }));
      return;
    }
    const ubicacion = ubicaciones.find((item) => item.id === value);
    if (!ubicacion) return;
    setForm((current) => ({
      ...current,
      lugar_referencia: ubicacion.nombre,
      latitud: ubicacion.latitud,
      longitud: ubicacion.longitud,
    }));
  };

  const handleFotosChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTouched((current) => ({ ...current, fotos: true }));
    const selectedFiles = Array.from(event.target.files ?? []);
    const imageFiles = selectedFiles.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length !== selectedFiles.length) {
      toast.error("Solo se permiten archivos de imagen.");
    }
    if (imageFiles.length === 0) {
      event.target.value = "";
      return;
    }

    const nextFiles = imageFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setFotos((current) => {
      const combined = [...current, ...nextFiles].slice(0, 3);
      if (current.length + nextFiles.length > 3) {
        toast.error("Solo puedes adjuntar hasta 3 fotos.");
      }
      const dropped = [...current, ...nextFiles].slice(3);
      dropped.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return combined;
    });
    event.target.value = "";
  };

  const removeFoto = (index: number) => {
    setTouched((current) => ({ ...current, fotos: true }));
    setFotos((current) => {
      const target = current[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((_, idx) => idx !== index);
    });
  };

  const resetAdjuntos = () => {
    setFotos((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
    setPreviewSeleccionado(null);
  };

  const previewFoto = (foto: FotoAdjunta) => {
    setPreviewSeleccionado(foto);
  };

  const closePreview = () => {
    setPreviewSeleccionado(null);
  };

  const openMapDialog = () => {
    const selectedLocation = ubicaciones.find((item) => item.id === ubicacionSeleccionada);
    setMapDraft({
      lat: form.latitud ?? selectedLocation?.latitud ?? DEFAULT_MAP_POINT.lat,
      lng: form.longitud ?? selectedLocation?.longitud ?? DEFAULT_MAP_POINT.lng,
    });
    setMapDialogOpen(true);
  };

  const applyMapCoordinates = () => {
    if (!mapDraft) {
      setMapConfirmOpen(false);
      return;
    }
    setForm((current) => ({
      ...current,
      latitud: Number(mapDraft.lat.toFixed(6)),
      longitud: Number(mapDraft.lng.toFixed(6)),
    }));
    setMapConfirmOpen(false);
    setMapDialogOpen(false);
    toast.success("Ubicacion marcada en el mapa");
  };

  const canAddFotos = fotos.length < 3;

  const createThread = () => {
    setSubmitted(true);
    if (!canSubmit) {
      toast.error("Revisa los campos marcados antes de publicar.");
      return;
    }
    startTransition(async () => {
      try {
        const created = await lostFoundClient.crearCaso({
          ...form,
          fecha_evento: new Date(form.fecha_evento).toISOString(),
        });
        if (fotos.length > 0) {
          await lostFoundClient.subirFotosArchivos(created.id, fotos.map((item) => item.file));
        }
        const response = await lostFoundClient.casosOperativo(threadParams());
        setCasos(response.items);
        setNextCursor(response.next_cursor ?? null);
        setForm(emptyForm);
        setTouched({});
        setSubmitted(false);
        setUbicacionSeleccionada("OTRO");
        resetAdjuntos();
        setOpen(false);
        toast.success("Hilo creado");
        router.push(`/lost-found-hilos/${created.id}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo crear el hilo");
      }
    });
  };

  const search = () => {
    startTransition(async () => {
      const response = await lostFoundClient.casosOperativo(threadParams());
      setCasos(response.items);
      setNextCursor(response.next_cursor ?? null);
    });
  };

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Hilos Lost & Found</h1>
          <p className="text-sm text-slate-500">Publicaciones, conversaciones y seguimiento comunitario.</p>
        </div>
        <Drawer
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) {
              setForm(emptyForm);
              setTouched({});
              setSubmitted(false);
              setUbicacionSeleccionada("OTRO");
              resetAdjuntos();
            }
          }}
          direction="right"
        >
          <DrawerTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Crear hilo</Button>
          </DrawerTrigger>
          <DrawerContent className="flex h-dvh max-h-dvh flex-col overflow-hidden p-0 sm:max-w-xl">
            <DrawerHeader className="shrink-0 border-b px-4 py-4">
              <DrawerTitle>Nuevo hilo Lost & Found</DrawerTitle>
              <DrawerDescription>Registra una publicacion operativa o comunitaria.</DrawerDescription>
            </DrawerHeader>
            <div className="mx-auto grid w-full max-w-2xl flex-1 gap-3 overflow-y-auto px-4 py-4">
              <Select value={form.tipo} onValueChange={(value) => setForm((f) => ({ ...f, tipo: value as "PERDIDO" | "ENCONTRADO" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENCONTRADO">Encontrado</SelectItem>
                  <SelectItem value="PERDIDO">Perdido</SelectItem>
                </SelectContent>
              </Select>
              <div className="space-y-2">
                <Label htmlFor="lf-titulo">Titulo</Label>
                <Input
                  id="lf-titulo"
                  placeholder="Ej. Celular negro en pabellon A"
                  value={form.titulo}
                  onBlur={() => setTouched((current) => ({ ...current, titulo: true }))}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                />
                <FieldError message={visibleError(formErrors.titulo, touched.titulo, submitted)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="lf-descripcion">Descripcion</Label>
                  <span className="text-xs text-slate-500">{form.descripcion.length}/500</span>
                </div>
                <Textarea
                  id="lf-descripcion"
                  placeholder="Describe rasgos, contenido visible, estado y detalles utiles para confirmar propiedad."
                  value={form.descripcion}
                  onBlur={() => setTouched((current) => ({ ...current, descripcion: true }))}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                />
                <FieldError message={visibleError(formErrors.descripcion, touched.descripcion, submitted)} />
              </div>
              <Select
                value={form.categoria_id || undefined}
                onValueChange={(value) => {
                  setTouched((current) => ({ ...current, categoria_id: true }));
                  setForm((f) => ({ ...f, categoria_id: value }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              <FieldError message={visibleError(formErrors.categoria_id, touched.categoria_id, submitted)} />
              <div className="space-y-2">
                <Label htmlFor="lf-fecha-evento">Fecha del evento</Label>
                <Input
                  id="lf-fecha-evento"
                  type="datetime-local"
                  value={toDateTimeLocalValue(form.fecha_evento)}
                  onBlur={() => setTouched((current) => ({ ...current, fecha_evento: true }))}
                  onChange={(e) => setForm((f) => ({ ...f, fecha_evento: fromDateTimeLocalValue(e.target.value) }))}
                />
                <FieldError message={visibleError(formErrors.fecha_evento, touched.fecha_evento, submitted)} />
              </div>
              <Select value={ubicacionSeleccionada} onValueChange={handleUbicacionChange}>
                <SelectTrigger><SelectValue placeholder="Ubicacion" /></SelectTrigger>
                <SelectContent>
                  {ubicaciones.map((ubicacion) => (
                    <SelectItem key={ubicacion.id} value={ubicacion.id}>{ubicacion.nombre}</SelectItem>
                  ))}
                  <SelectItem value="OTRO">Otro (ingresar manualmente)</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                {ubicacionSeleccionada === "OTRO" && (
                  <Input
                    placeholder="Lugar de referencia"
                    value={form.lugar_referencia}
                    onBlur={() => setTouched((current) => ({ ...current, lugar_referencia: true }))}
                    onChange={(e) => setForm((f) => ({ ...f, lugar_referencia: e.target.value }))}
                  />
                )}
                <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={openMapDialog} aria-label="Marcar ubicacion en mapa">
                  <MapPin className="h-4 w-4" />
                </Button>
              </div>
              {form.latitud != null && form.longitud != null && (
                <p className="text-xs text-slate-500">Coordenadas: {form.latitud.toFixed(6)}, {form.longitud.toFixed(6)}</p>
              )}
              <FieldError message={visibleError(formErrors.lugar_referencia, touched.lugar_referencia, submitted)} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder="Color" value={form.color_principal ?? ""} onChange={(e) => setForm((f) => ({ ...f, color_principal: e.target.value }))} />
                <Input placeholder="Marca" value={form.marca ?? ""} onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lf-fotos-input">Fotos de evidencia (max. 3)</Label>
                <Input
                  id="lf-fotos-input"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/heic,image/gif"
                  onChange={handleFotosChange}
                  disabled={!canAddFotos}
                />
                <FieldError message={visibleError(formErrors.fotos, touched.fotos, submitted)} />
                {!canAddFotos && <p className="text-xs text-amber-600">Ya alcanzaste el maximo de 3 fotos.</p>}
                {fotos.length > 0 && (
                  <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                    <p className="text-xs font-medium text-slate-600">Adjuntos seleccionados ({fotos.length})</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {fotos.map((foto, index) => (
                        <AttachmentPreviewCard
                          key={`${foto.file.name}-${index}`}
                          foto={foto}
                          onPreview={() => previewFoto(foto)}
                          onRemove={() => removeFoto(index)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DrawerFooter className="mx-auto w-full max-w-2xl shrink-0 border-t bg-white px-4 py-3">
              <Button onClick={createThread} disabled={isPending}>Publicar hilo</Button>
              <DrawerClose asChild><Button variant="outline">Cancelar</Button></DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>

      <section className="rounded-lg border bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_160px_180px_220px_150px_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por codigo, objeto, lugar o marca" />
        </div>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos</SelectItem>
            <SelectItem value="PERDIDO">Perdidos</SelectItem>
            <SelectItem value="ENCONTRADO">Encontrados</SelectItem>
          </SelectContent>
        </Select>
        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos los estados</SelectItem>
            <SelectItem value="ABIERTO">Abiertos</SelectItem>
            <SelectItem value="EN_REVISION">En revision</SelectItem>
            <SelectItem value="CONFIRMADO">Confirmados</SelectItem>
            <SelectItem value="EN_CUSTODIA">En custodia</SelectItem>
            <SelectItem value="CERRADO">Cerrados</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODAS">Todas las categorias</SelectItem>
            {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={columns} onValueChange={setColumns}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 por fila</SelectItem>
            <SelectItem value="4">4 por fila</SelectItem>
          </SelectContent>
        </Select>
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => value && setViewMode(value as "grid" | "list")}
          className="justify-start"
        >
          <ToggleGroupItem value="grid" aria-label="Vista grid">
            <Grid2X2 className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="Vista lista compacta">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
        <Button onClick={search} disabled={isPending}>
          <Search className="mr-2 h-4 w-4" />
          Buscar
        </Button>
        </div>
      </section>

      <Dialog open={Boolean(previewSeleccionado)} onOpenChange={(isOpen) => !isOpen && closePreview()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewSeleccionado?.file.name ?? "Vista previa"}</DialogTitle>
          </DialogHeader>
          {previewSeleccionado && (
            <div className="rounded-lg border bg-slate-50 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewSeleccionado.previewUrl} alt={previewSeleccionado.file.name} className="max-h-[70vh] w-full rounded object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Seleccionar ubicacion exacta</DialogTitle>
            <DialogDescription>
              Haz clic en el mapa para marcar donde se perdio o encontro el objeto.
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
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setMapDialogOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={() => setMapConfirmOpen(true)}>Guardar ubicacion</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={mapConfirmOpen} onOpenChange={setMapConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar ubicacion</AlertDialogTitle>
            <AlertDialogDescription>
              Se aplicaran las coordenadas seleccionadas al hilo. Puedes ajustar el texto del lugar manualmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={applyMapCoordinates}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className={viewMode === "grid" ? gridClass(columns) : "grid gap-2"}>
          {/*
            <Link key={caso.id} href={`/lost-found-hilos/${caso.id}`} className="block">
              <Card className="h-full transition hover:border-[#001C55]/30 hover:shadow-sm">
                <CardContent className={viewMode === "grid" ? "relative flex h-full flex-col gap-3 p-4 pr-32" : "relative flex min-h-32 flex-col gap-2 p-3 pr-36"}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={caso.reportante?.avatar_url ?? undefined} />
                      <AvatarFallback>{initials(caso.reportante?.nombre_completo)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-950">{caso.reportante?.nombre_completo ?? "Usuario"}</p>
                      <p className="text-xs text-slate-500">{formatDate(caso.ultimo_comentario_at ?? caso.created_at)}</p>
                    </div>
                  </div>
                  <CaseThumbnail caso={caso} compact={viewMode === "list"} />
                  <div className="space-y-1">
                    <p className="line-clamp-1 font-semibold text-slate-950">{caso.titulo}</p>
                    <p className="text-xs text-slate-500">{caso.codigo} · {caso.lugar_referencia}</p>
                  </div>
                  <p className="text-sm text-slate-600">{truncateText(caso.ultimo_comentario ?? caso.descripcion, 120)}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={estadoLfTone[caso.estado]}>{estadoLabel(caso.estado)}</Badge>
                    <Badge variant="secondary">{tipoLabel(caso.tipo)}</Badge>
                    {caso.categoria_nombre && <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">{caso.categoria_nombre}</Badge>}
                    <span className="ml-auto flex items-center gap-1 text-sm text-slate-500"><MessageSquare className="h-4 w-4" />{caso.conteo_comentarios}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          */}
          {casos.map((caso) => <ThreadCard key={caso.id} caso={caso} viewMode={viewMode} />)}
          {casos.length === 0 && !isPending && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">No hay hilos para mostrar.</p>
          )}
          {isPending && <ThreadSkeletons viewMode={viewMode} count={viewMode === "grid" ? 4 : 3} />}
      </div>
      <div ref={loadMoreRef} className="h-1" />
      {!nextCursor && casos.length > 0 && (
        <p className="text-center text-xs text-slate-500">No hay mas hilos para mostrar.</p>
      )}
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function ThreadCard({ caso, viewMode }: { caso: CasoLfListItem; viewMode: "grid" | "list" }) {
  if (viewMode === "list") {
    return (
      <Link href={`/lost-found-hilos/${caso.id}`} className="block">
        <Card className="transition hover:border-[#001C55]/30 hover:shadow-sm">
          <CardContent className="grid min-h-24 grid-cols-[72px_1fr_auto] items-center gap-4 p-4">
            <CaseThumbnail caso={caso} compact />
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-semibold text-slate-950">{caso.titulo}</p>
                <Badge variant="outline" className={estadoLfTone[caso.estado]}>{estadoLabel(caso.estado)}</Badge>
                <Badge variant="secondary">{tipoLabel(caso.tipo)}</Badge>
                {caso.categoria_nombre && <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">{caso.categoria_nombre}</Badge>}
              </div>
              <p className="truncate text-sm text-slate-600">{truncateText(caso.ultimo_comentario ?? caso.descripcion, 120)}</p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{caso.reportante?.nombre_completo ?? "Usuario"}</span>
                <span>{formatDate(caso.ultimo_comentario_at ?? caso.created_at)}</span>
              </div>
            </div>
            <div className="hidden min-w-36 text-right text-sm text-slate-500 sm:block">
              <p className="font-medium text-slate-700">{caso.lugar_referencia ?? "Sin lugar"}</p>
              <p>{caso.codigo}</p>
              <p className="mt-2 inline-flex items-center gap-1"><MessageSquare className="h-4 w-4" />{caso.conteo_comentarios}</p>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  const hasPhoto = Boolean(caso.foto_url);

  return (
    <Link href={`/lost-found-hilos/${caso.id}`} className="block">
      <Card className="h-full overflow-hidden transition hover:border-[#001C55]/30 hover:shadow-sm">
        <CardContent className={hasPhoto ? "grid h-full min-h-64 grid-cols-[minmax(132px,42%)_minmax(0,1fr)] p-0" : "flex h-full min-h-64 flex-col p-4"}>
          {hasPhoto && (
            <div className="relative min-h-full">
              <Badge variant="outline" className={`absolute left-3 top-3 z-10 bg-white/95 ${estadoLfTone[caso.estado]}`}>{estadoLabel(caso.estado)}</Badge>
              <CaseThumbnail caso={caso} compact={false} />
            </div>
          )}
          <div className={hasPhoto ? "flex min-w-0 flex-col gap-3 p-4" : "flex min-w-0 flex-1 flex-col gap-3"}>
            <div className="min-w-0">
              <p className="line-clamp-1 text-lg font-semibold text-slate-950">{caso.titulo}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {!hasPhoto && <Badge variant="outline" className={estadoLfTone[caso.estado]}>{estadoLabel(caso.estado)}</Badge>}
                <Badge variant="secondary">{tipoLabel(caso.tipo)}</Badge>
                {caso.categoria_nombre && <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">{caso.categoria_nombre}</Badge>}
              </div>
            </div>
            <p className="line-clamp-3 text-sm leading-5 text-slate-600">{truncateText(caso.ultimo_comentario ?? caso.descripcion, 120)}</p>
            <div className="mt-auto space-y-2 border-t pt-3 text-sm text-slate-500">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={caso.reportante?.avatar_url ?? undefined} />
                  <AvatarFallback>{initials(caso.reportante?.nombre_completo)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 truncate font-medium text-slate-700">{shortDisplayName(caso.reportante?.nombre_completo)}</span>
              </div>
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-x-3 gap-y-1 text-xs">
                <span className="inline-flex min-w-0 items-center gap-1 text-slate-600">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{caso.lugar_referencia ?? "Sin lugar"}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-slate-600">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {caso.conteo_comentarios}
                </span>
                <span className="col-span-2 break-all text-[11px] text-slate-500">{caso.codigo}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function initials(name?: string | null) {
  return (name ?? "U").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function shortDisplayName(name?: string | null) {
  if (!name) return "Usuario";
  const [first, second] = name.trim().split(/\s+/);
  return second ? `${first} ${second[0]}.` : first;
}

function gridClass(columns: string) {
  const map: Record<string, string> = {
    "3": "grid gap-3 md:grid-cols-2 xl:grid-cols-3",
    "4": "grid gap-3 md:grid-cols-2 xl:grid-cols-4",
  };
  return map[columns] ?? map["4"];
}

function validateCase(form: CasoLfCreatePayload, fotoCount: number): FormErrors {
  const errors: FormErrors = {};
  const descriptionLength = form.descripcion.trim().length;
  if (form.titulo.trim().length < 3) errors.titulo = "El titulo debe tener al menos 3 caracteres.";
  if (descriptionLength < 20 || descriptionLength > 500) errors.descripcion = "La descripcion debe tener entre 20 y 500 caracteres.";
  if (!form.categoria_id) errors.categoria_id = "Selecciona una categoria.";
  if (!form.fecha_evento || Number.isNaN(new Date(form.fecha_evento).getTime())) errors.fecha_evento = "Indica la fecha del evento.";
  if (form.lugar_referencia.trim().length < 3) errors.lugar_referencia = "El lugar es obligatorio.";
  if (fotoCount < 1) errors.fotos = "La foto es obligatoria.";
  return errors;
}

function visibleError(message: string | undefined, touched?: boolean, submitted?: boolean) {
  return touched || submitted ? message : undefined;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs font-medium text-rose-600">{message}</p>;
}

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(value: string) {
  return value ? new Date(value).toISOString() : "";
}

function truncateText(value: string | null | undefined, maxLength: number) {
  const text = (value ?? "").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}...` : text;
}

function CaseThumbnail({ caso, compact }: { caso: CasoLfListItem; compact: boolean }) {
  const sizeClass = compact ? "h-16 w-16 rounded-lg" : "h-full w-full rounded-none border-0";
  const frameClass = compact ? "rounded-lg border" : "rounded-none border-0";
  if (!caso.foto_url) {
    return (
      <div className={`${sizeClass} ${frameClass} flex items-center justify-center border-dashed border-slate-300 bg-slate-50 text-slate-400`}>
        <PackageSearch className="h-7 w-7" />
      </div>
    );
  }
  return (
    <div className={`${sizeClass} ${frameClass} overflow-hidden bg-slate-50`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={caso.foto_url} alt={caso.titulo} className="h-full w-full object-cover" />
    </div>
  );
}

function ThreadSkeletons({ viewMode, count }: { viewMode: "grid" | "list"; count: number }) {
  return Array.from({ length: count }).map((_, index) => (
    <Card key={`thread-skeleton-${index}`}>
      <CardContent className={viewMode === "grid" ? "space-y-3 p-4" : "grid gap-3 p-3 sm:grid-cols-[1fr_120px]"}>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
        {viewMode === "list" && <Skeleton className="h-24 w-28 justify-self-end" />}
      </CardContent>
    </Card>
  ));
}

function AttachmentPreviewCard({
  foto,
  onPreview,
  onRemove,
}: {
  foto: FotoAdjunta;
  onPreview: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border bg-white p-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={foto.previewUrl} alt={foto.file.name} className="h-20 w-full rounded object-cover" />
      <p className="mt-2 truncate text-[11px] text-slate-600">{foto.file.name}</p>
      <div className="mt-2 grid grid-cols-2 gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 w-full p-0"
          aria-label="Ver imagen adjunta"
          title="Ver imagen"
          onClick={onPreview}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 w-full p-0 text-rose-600"
          aria-label="Quitar imagen adjunta"
          title="Quitar imagen"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
