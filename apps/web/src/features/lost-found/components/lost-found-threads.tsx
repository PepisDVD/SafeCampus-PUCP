"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useEffect, useRef, useState, useTransition } from "react";
import {
  Badge,
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
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@safecampus/ui-kit";
import { Eye, MessageSquare, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { lostFoundClient, type CasoLfCreatePayload } from "../client";
import { estadoLabel, estadoLfTone, tipoLabel } from "../presentation";
import type { CasoLfListItem, CategoriaLf, UbicacionMaestra } from "../types";

type Props = {
  initialCasos: CasoLfListItem[];
  categorias: CategoriaLf[];
  ubicaciones: UbicacionMaestra[];
};

type FotoAdjunta = {
  file: File;
  previewUrl: string;
};

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

export function LostFoundThreads({ initialCasos, categorias, ubicaciones }: Props) {
  const router = useRouter();
  const [casos, setCasos] = useState(initialCasos);
  const [query, setQuery] = useState("");
  const [tipo, setTipo] = useState("TODOS");
  const [estado, setEstado] = useState("TODOS");
  const [categoria, setCategoria] = useState("TODAS");
  const [columns, setColumns] = useState("4");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CasoLfCreatePayload>(emptyForm);
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState("OTRO");
  const [fotos, setFotos] = useState<FotoAdjunta[]>([]);
  const [previewSeleccionado, setPreviewSeleccionado] = useState<FotoAdjunta | null>(null);
  const [isPending, startTransition] = useTransition();
  const fotosRef = useRef<FotoAdjunta[]>([]);

  useEffect(() => {
    fotosRef.current = fotos;
  }, [fotos]);

  useEffect(() => {
    return () => {
      fotosRef.current.forEach((foto) => URL.revokeObjectURL(foto.previewUrl));
    };
  }, []);

  const handleUbicacionChange = (value: string) => {
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
    }));
  };

  const handleFotosChange = (event: ChangeEvent<HTMLInputElement>) => {
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

  const canAddFotos = fotos.length < 3;

  const createThread = () => {
    const validation = validateCase(form);
    if (validation) {
      toast.error(validation);
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
        setCasos((await lostFoundClient.casosOperativo()).items);
        setForm(emptyForm);
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
      const params = query.trim() ? { search: query.trim() } : undefined;
      setCasos((await lostFoundClient.casosOperativo({
        ...(params ?? {}),
        ...(tipo !== "TODOS" ? { tipo } : {}),
        ...(estado !== "TODOS" ? { estado } : {}),
        ...(categoria !== "TODAS" ? { categoria_id: categoria } : {}),
      })).items);
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
              <Input placeholder="Titulo" value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
              <Textarea placeholder="Descripcion" value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} />
              <Select value={form.categoria_id || undefined} onValueChange={(value) => setForm((f) => ({ ...f, categoria_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={ubicacionSeleccionada} onValueChange={handleUbicacionChange}>
                <SelectTrigger><SelectValue placeholder="Ubicacion" /></SelectTrigger>
                <SelectContent>
                  {ubicaciones.map((ubicacion) => (
                    <SelectItem key={ubicacion.id} value={ubicacion.id}>{ubicacion.nombre}</SelectItem>
                  ))}
                  <SelectItem value="OTRO">Otro (ingresar manualmente)</SelectItem>
                </SelectContent>
              </Select>
              {ubicacionSeleccionada === "OTRO" && (
                <Input
                  placeholder="Lugar de referencia"
                  value={form.lugar_referencia}
                  onChange={(e) => setForm((f) => ({ ...f, lugar_referencia: e.target.value }))}
                />
              )}
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
              <Button onClick={createThread} disabled={isPending || Boolean(validateCase(form))}>Publicar hilo</Button>
              <DrawerClose asChild><Button variant="outline">Cancelar</Button></DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>

      <section className="rounded-lg border bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_160px_180px_220px_150px_auto]">
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
            <SelectItem value="5">5 por fila</SelectItem>
          </SelectContent>
        </Select>
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

      <div className={gridClass(columns)}>
          {casos.map((caso) => (
            <Link key={caso.id} href={`/lost-found-hilos/${caso.id}`} className="block">
              <Card className="h-full transition hover:border-[#001C55]/30 hover:shadow-sm">
                <CardContent className="flex h-full flex-col gap-3 p-4">
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
                  <div className="space-y-1">
                    <p className="line-clamp-1 font-semibold text-slate-950">{caso.titulo}</p>
                    <p className="text-xs text-slate-500">{caso.codigo} · {caso.lugar_referencia}</p>
                  </div>
                  <p className="line-clamp-3 flex-1 text-sm text-slate-600">{caso.ultimo_comentario ?? caso.descripcion}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={estadoLfTone[caso.estado]}>{estadoLabel(caso.estado)}</Badge>
                    <Badge variant="secondary">{tipoLabel(caso.tipo)}</Badge>
                    <span className="ml-auto flex items-center gap-1 text-sm text-slate-500"><MessageSquare className="h-4 w-4" />{caso.conteo_comentarios}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {casos.length === 0 && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">No hay hilos para mostrar.</p>
          )}
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function initials(name?: string | null) {
  return (name ?? "U").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function gridClass(columns: string) {
  const map: Record<string, string> = {
    "3": "grid gap-3 md:grid-cols-2 xl:grid-cols-3",
    "4": "grid gap-3 md:grid-cols-2 xl:grid-cols-4",
    "5": "grid gap-3 md:grid-cols-2 xl:grid-cols-5",
  };
  return map[columns] ?? map["4"];
}

function validateCase(form: CasoLfCreatePayload) {
  if (form.titulo.trim().length < 3) return "El titulo debe tener al menos 3 caracteres.";
  if (form.descripcion.trim().length < 10) return "La descripcion debe tener al menos 10 caracteres.";
  if (!form.categoria_id) return "Selecciona una categoria.";
  if (form.lugar_referencia.trim().length < 3) return "El lugar de referencia debe tener al menos 3 caracteres.";
  return "";
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
