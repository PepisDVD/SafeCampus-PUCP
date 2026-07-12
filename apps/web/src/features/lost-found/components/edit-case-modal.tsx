"use client";

import dynamic from "next/dynamic";
import { type ChangeEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
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
  Spinner,
  Textarea,
  toast,
} from "@safecampus/ui-kit";
import { ImageIcon, MapPin, X } from "lucide-react";
import { lostFoundClient } from "../client";
import { activeMetadatoCampos, MetadatoFields, metadatosToValues, validateMetadatos, valuesToMetadatos } from "./metadato-fields";
import { CharCounter, LF_TEXT_LIMITS } from "./text-field-help";
import type { CasoLfDetail, CategoriaLf, UbicacionMaestra } from "../types";
import { fromLimaDateTimeInputValue, toLimaDateTimeInputValue } from "@/lib/lima-date";

const ACCEPT_IMAGES = "image/jpeg,image/png,image/webp,image/heic,image/gif";
const MAX_IMAGES = 3;
const DEFAULT_MAP_POINT = { lat: -12.06945, lng: -77.08055 };

const LeafletCoordinatePicker = dynamic(
  () => import("@/features/admin/components/maestros/leaflet-coordinate-picker").then((mod) => mod.LeafletCoordinatePicker),
  { ssr: false },
);

type FotoAdjunta = { file: File; previewUrl: string };

export function EditCaseModal({
  open,
  onOpenChange,
  caso,
  categorias,
  ubicaciones,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caso: CasoLfDetail;
  categorias: CategoriaLf[];
  ubicaciones?: UbicacionMaestra[];
  onSaved: (caso: CasoLfDetail) => void;
}) {
  const [titulo, setTitulo] = useState(caso.titulo);
  const [descripcion, setDescripcion] = useState(caso.descripcion);
  const [categoriaId, setCategoriaId] = useState(caso.categoria_id ?? "");
  const [lugar, setLugar] = useState(caso.lugar_referencia ?? "");
  const [latitud, setLatitud] = useState<number | null>(caso.latitud ?? null);
  const [longitud, setLongitud] = useState<number | null>(caso.longitud ?? null);
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState(() => resolveInitialLocation(caso, ubicaciones));
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [mapConfirmOpen, setMapConfirmOpen] = useState(false);
  const [mapDraft, setMapDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [fecha, setFecha] = useState(caso.fecha_evento ?? caso.created_at);
  const [metadatos, setMetadatos] = useState<Record<string, string>>(() =>
    metadatosToValues(activeMetadatoCampos(categorias.find((c) => c.id === (caso.categoria_id ?? ""))), caso.metadatos ?? {}),
  );
  const initialImagenes = useMemo(
    () => [caso.foto_url, ...(caso.foto_adicional_urls ?? [])].filter(Boolean) as string[],
    [caso.foto_url, caso.foto_adicional_urls],
  );
  const [imagenesExistentes, setImagenesExistentes] = useState<string[]>(initialImagenes);
  const [nuevasFotos, setNuevasFotos] = useState<FotoAdjunta[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const nuevasFotosRef = useRef<FotoAdjunta[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    nuevasFotosRef.current = nuevasFotos;
  }, [nuevasFotos]);
  useEffect(() => () => nuevasFotosRef.current.forEach((f) => URL.revokeObjectURL(f.previewUrl)), []);

  const totalImagenes = imagenesExistentes.length + nuevasFotos.length;

  const handleFotos = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    const images = selected.filter((f) => f.type.startsWith("image/"));
    if (images.length !== selected.length) toast.error("Solo se permiten archivos de imagen.");
    if (images.length === 0) {
      event.target.value = "";
      return;
    }
    const disponibles = MAX_IMAGES - totalImagenes;
    if (disponibles <= 0) {
      toast.error(`Solo puedes tener hasta ${MAX_IMAGES} imágenes.`);
      event.target.value = "";
      return;
    }
    const aceptadas = images.slice(0, disponibles);
    if (images.length > disponibles) toast.error(`Solo puedes tener hasta ${MAX_IMAGES} imágenes.`);
    setNuevasFotos((current) => [...current, ...aceptadas.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))]);
    event.target.value = "";
  };

  const removeExistente = (url: string) => setImagenesExistentes((current) => current.filter((u) => u !== url));
  const removeNueva = (index: number) =>
    setNuevasFotos((current) => {
      const target = current[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((_, idx) => idx !== index);
    });

  const campos = useMemo(
    () => activeMetadatoCampos(categorias.find((c) => c.id === categoriaId)),
    [categorias, categoriaId],
  );

  const onCategoria = (value: string) => {
    setCategoriaId(value);
    const nuevos = activeMetadatoCampos(categorias.find((c) => c.id === value));
    // Si vuelve a la categoría original conserva sus metadatos; si cambia, parte en limpio.
    setMetadatos(metadatosToValues(nuevos, value === caso.categoria_id ? (caso.metadatos ?? {}) : {}));
  };

  const onUbicacion = (value: string) => {
    setUbicacionSeleccionada(value);
    if (value === "OTRO") {
      setLugar("");
      setLatitud(null);
      setLongitud(null);
      openMapDialog();
      return;
    }
    const ubicacion = ubicaciones?.find((item) => item.id === value);
    if (!ubicacion) return;
    setLugar(ubicacion.nombre);
    setLatitud(ubicacion.latitud);
    setLongitud(ubicacion.longitud);
  };

  const openMapDialog = () => {
    const selectedLocation = ubicaciones?.find((item) => item.id === ubicacionSeleccionada);
    setMapDraft({
      lat: latitud ?? selectedLocation?.latitud ?? DEFAULT_MAP_POINT.lat,
      lng: longitud ?? selectedLocation?.longitud ?? DEFAULT_MAP_POINT.lng,
    });
    setMapDialogOpen(true);
  };

  const applyMapCoordinates = () => {
    if (!mapDraft) {
      setMapConfirmOpen(false);
      return;
    }
    setLatitud(Number(mapDraft.lat.toFixed(6)));
    setLongitud(Number(mapDraft.lng.toFixed(6)));
    setMapConfirmOpen(false);
    setMapDialogOpen(false);
    toast.success("Ubicacion marcada en el mapa");
  };

  const submit = () => {
    if (titulo.trim().length < 3) { toast.error("El título debe tener al menos 3 caracteres."); return; }
    if (descripcion.trim().length < 10) { toast.error("La descripción debe tener al menos 10 caracteres."); return; }
    if (!categoriaId) { toast.error("Selecciona una categoría."); return; }
    if (lugar.trim().length < 3) { toast.error("Indica el lugar de referencia."); return; }
    if (!fecha || Number.isNaN(new Date(fecha).getTime())) { toast.error("Indica la fecha del evento."); return; }
    const metaError = validateMetadatos(campos, metadatos);
    if (metaError) { toast.error(metaError); return; }

    startTransition(async () => {
      try {
        let saved = await lostFoundClient.actualizarCaso(caso.id, {
          titulo,
          descripcion,
          categoria_id: categoriaId,
          lugar_referencia: lugar,
          fecha_evento: fecha,
          color_principal: caso.color_principal ?? undefined,
          marca: caso.marca ?? undefined,
          etiquetas: caso.etiquetas,
          contacto_info: caso.contacto_info ?? undefined,
          latitud,
          longitud,
          metadatos: valuesToMetadatos(campos, metadatos),
        });

        // Sube las imágenes nuevas (sin mutar el caso) y persiste la lista final.
        const nuevasUrls = nuevasFotos.length
          ? await lostFoundClient.subirMediaCaso(caso.id, nuevasFotos.map((f) => f.file))
          : [];
        const finalImagenes = [...imagenesExistentes, ...nuevasUrls].slice(0, MAX_IMAGES);
        const cambiaronImagenes =
          nuevasFotos.length > 0 ||
          finalImagenes.length !== initialImagenes.length ||
          finalImagenes.some((url, idx) => url !== initialImagenes[idx]);
        if (cambiaronImagenes) {
          saved = await lostFoundClient.actualizarFotos(caso.id, {
            foto_url: finalImagenes[0],
            foto_adicional_urls: finalImagenes.slice(1),
          });
        }

        onSaved(saved);
        onOpenChange(false);
        toast.success("Hilo actualizado");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo actualizar el hilo");
      }
    });
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-4 text-left">
          <DialogTitle>Editar hilo</DialogTitle>
          <DialogDescription>Actualiza los datos descriptivos de la publicación.</DialogDescription>
        </DialogHeader>
        <div className="grid min-w-0 flex-1 gap-3 overflow-y-auto overflow-x-hidden px-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-titulo">Título</Label>
            <Input id="edit-titulo" value={titulo} maxLength={LF_TEXT_LIMITS.titulo.max} onChange={(e) => setTitulo(e.target.value)} />
            <CharCounter value={titulo} min={LF_TEXT_LIMITS.titulo.min} max={LF_TEXT_LIMITS.titulo.max} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-descripcion">Descripción</Label>
            <Textarea
              id="edit-descripcion"
              value={descripcion}
              rows={5}
              maxLength={LF_TEXT_LIMITS.descripcion.max}
              className="max-h-72 min-h-28 w-full resize-y overflow-x-hidden break-all field-sizing-fixed"
              onChange={(e) => setDescripcion(e.target.value)}
            />
            <CharCounter value={descripcion} min={LF_TEXT_LIMITS.descripcion.min} max={LF_TEXT_LIMITS.descripcion.max} />
          </div>
          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select value={categoriaId || undefined} onValueChange={onCategoria}>
              <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
              <SelectContent>
                {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-fecha">Fecha del evento</Label>
            <Input
              id="edit-fecha"
              type="datetime-local"
              value={toDateTimeLocalValue(fecha)}
              onChange={(e) => setFecha(fromDateTimeLocalValue(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-lugar">Lugar de referencia</Label>
            {ubicaciones?.length ? (
              <Select value={ubicacionSeleccionada} onValueChange={onUbicacion}>
                <SelectTrigger><SelectValue placeholder="Ubicacion" /></SelectTrigger>
                <SelectContent>
                  {ubicaciones.map((ubicacion) => <SelectItem key={ubicacion.id} value={ubicacion.id}>{ubicacion.nombre}</SelectItem>)}
                  <SelectItem value="OTRO">Otro</SelectItem>
                </SelectContent>
              </Select>
            ) : null}
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Input id="edit-lugar" value={lugar} maxLength={LF_TEXT_LIMITS.lugar_referencia.max} onChange={(e) => setLugar(e.target.value)} />
              <Button type="button" variant="outline" size="icon" onClick={openMapDialog} aria-label="Seleccionar ubicacion exacta">
                <MapPin className="h-4 w-4" />
              </Button>
            </div>
            <CharCounter value={lugar} min={LF_TEXT_LIMITS.lugar_referencia.min} max={LF_TEXT_LIMITS.lugar_referencia.max} />
            {latitud != null && longitud != null && (
              <p className="text-xs text-slate-500">Coordenadas: {latitud.toFixed(6)}, {longitud.toFixed(6)}</p>
            )}
          </div>
          <MetadatoFields campos={campos} values={metadatos} onChange={(c, v) => setMetadatos((prev) => ({ ...prev, [c]: v }))} />

          <div className="space-y-2">
            <Label>Imágenes <span className="text-xs font-normal text-slate-500">(máx. {MAX_IMAGES})</span></Label>
            {totalImagenes === 0 && (
              <p className="text-sm text-slate-500">Sin imágenes. Puedes adjuntar hasta {MAX_IMAGES}.</p>
            )}
            <div className="flex flex-wrap gap-2">
              {imagenesExistentes.map((url) => (
                <div key={url} className="relative h-20 w-20 overflow-hidden rounded-md border bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExistente(url)}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                    aria-label="Quitar imagen"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {nuevasFotos.map((foto, index) => (
                <div key={foto.previewUrl} className="relative h-20 w-20 overflow-hidden rounded-md border bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={foto.previewUrl} alt="" className="h-full w-full object-cover" />
                  <span className="absolute left-0.5 top-0.5 rounded bg-emerald-600/90 px-1 text-[10px] font-medium text-white">Nueva</span>
                  <button
                    type="button"
                    onClick={() => removeNueva(index)}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                    aria-label="Quitar imagen"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <input ref={fileRef} type="file" accept={ACCEPT_IMAGES} multiple hidden onChange={handleFotos} />
            <Button type="button" variant="outline" size="sm" disabled={totalImagenes >= MAX_IMAGES} onClick={() => fileRef.current?.click()}>
              <ImageIcon className="mr-1 h-4 w-4" />
              Agregar imagen {totalImagenes > 0 ? `(${totalImagenes}/${MAX_IMAGES})` : ""}
            </Button>
          </div>
        </div>
        <DialogFooter className="shrink-0 gap-2 border-t bg-white px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Guardar cambios
          </Button>
        </DialogFooter>
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
            Se aplicaran las coordenadas seleccionadas al caso. Puedes ajustar el lugar de referencia antes de guardar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={applyMapCoordinates}>Confirmar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

function toDateTimeLocalValue(value?: string | null) {
  return toLimaDateTimeInputValue(value);
}

function fromDateTimeLocalValue(value: string) {
  return fromLimaDateTimeInputValue(value);
}

function resolveInitialLocation(caso: CasoLfDetail, ubicaciones?: UbicacionMaestra[]) {
  const match = ubicaciones?.find((ubicacion) => (
    ubicacion.nombre === caso.lugar_referencia ||
    (caso.latitud != null &&
      caso.longitud != null &&
      Math.abs(ubicacion.latitud - caso.latitud) < 0.000001 &&
      Math.abs(ubicacion.longitud - caso.longitud) < 0.000001)
  ));
  return match?.id ?? "OTRO";
}
