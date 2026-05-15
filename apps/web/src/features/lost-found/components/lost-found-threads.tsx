"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@safecampus/ui-kit";
import { MessageSquare, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { lostFoundClient, type CasoLfCreatePayload } from "../client";
import { estadoLabel, estadoLfTone, tipoLabel } from "../presentation";
import type { CasoLfListItem, CategoriaLf } from "../types";

type Props = {
  initialCasos: CasoLfListItem[];
  categorias: CategoriaLf[];
};

const emptyForm: CasoLfCreatePayload = {
  tipo: "ENCONTRADO",
  titulo: "",
  descripcion: "",
  categoria_id: "",
  lugar_referencia: "",
  fecha_evento: new Date().toISOString(),
  foto_url: "",
  color_principal: "",
  marca: "",
  etiquetas: [],
};

export function LostFoundThreads({ initialCasos, categorias }: Props) {
  const router = useRouter();
  const [casos, setCasos] = useState(initialCasos);
  const [query, setQuery] = useState("");
  const [tipo, setTipo] = useState("TODOS");
  const [estado, setEstado] = useState("TODOS");
  const [categoria, setCategoria] = useState("TODAS");
  const [columns, setColumns] = useState("4");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CasoLfCreatePayload>(emptyForm);
  const [isPending, startTransition] = useTransition();

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
        setCasos((await lostFoundClient.casosOperativo()).items);
        setForm(emptyForm);
        setOpen(false);
        toast.success("Hilo creado");
        router.push(`/lost-found-hilos/${created.id}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo crear el hilo");
      }
    });
  };

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Hilos Lost & Found</h1>
          <p className="text-sm text-slate-500">Publicaciones, conversaciones y seguimiento comunitario.</p>
        </div>
        <Drawer open={open} onOpenChange={setOpen} direction="right">
          <DrawerTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Crear hilo</Button>
          </DrawerTrigger>
          <DrawerContent className="sm:max-w-xl">
            <DrawerHeader>
              <DrawerTitle>Nuevo hilo Lost & Found</DrawerTitle>
              <DrawerDescription>Registra una publicacion operativa o comunitaria.</DrawerDescription>
            </DrawerHeader>
            <div className="mx-auto grid w-full max-w-2xl gap-3 px-4 pb-4">
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
              <Input placeholder="Lugar de referencia" value={form.lugar_referencia} onChange={(e) => setForm((f) => ({ ...f, lugar_referencia: e.target.value }))} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder="Color" value={form.color_principal ?? ""} onChange={(e) => setForm((f) => ({ ...f, color_principal: e.target.value }))} />
                <Input placeholder="Marca" value={form.marca ?? ""} onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))} />
              </div>
              <Input placeholder="URL de foto" value={form.foto_url ?? ""} onChange={(e) => setForm((f) => ({ ...f, foto_url: e.target.value }))} />
            </div>
            <DrawerFooter className="mx-auto w-full max-w-2xl">
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
