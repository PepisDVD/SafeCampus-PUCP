"use client";

import { useMemo, useState, useTransition } from "react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from "@safecampus/ui-kit";
import { CalendarDays, Check, MessageSquare, PackageSearch, Search, X } from "lucide-react";
import { toast } from "sonner";
import { lostFoundClient, type CasoLfCreatePayload } from "../client";
import { estadoLabel, estadoLfTone, tipoLabel } from "../presentation";
import type { CasoLfDetail, CasoLfListItem, CategoriaLf, MatchLf } from "../types";

type Props = {
  categorias: CategoriaLf[];
  initialFeed: CasoLfListItem[];
  initialMine: CasoLfListItem[];
};

const emptyForm: CasoLfCreatePayload = {
  tipo: "PERDIDO",
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

export function LostFoundCommunity({ categorias, initialFeed, initialMine }: Props) {
  const [feed, setFeed] = useState(initialFeed);
  const [mine, setMine] = useState(initialMine);
  const [selected, setSelected] = useState<CasoLfDetail | null>(null);
  const [matches, setMatches] = useState<MatchLf[]>([]);
  const [query, setQuery] = useState("");
  const [tipo, setTipo] = useState<"PERDIDO" | "ENCONTRADO" | "">("");
  const [form, setForm] = useState<CasoLfCreatePayload>(emptyForm);
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredMine = useMemo(() => mine.slice(0, 5), [mine]);

  const refreshFeed = () => {
    startTransition(async () => {
      const params: Record<string, string> = {};
      if (query) params.search = query;
      if (tipo) params.tipo = tipo;
      const next = await lostFoundClient.feed(params);
      setFeed(next.items);
    });
  };

  const openDetail = (item: CasoLfListItem) => {
    startTransition(async () => {
      const detail = await lostFoundClient.detalle(item.id);
      setSelected(detail);
      const ms = await lostFoundClient.matches(item.id).catch(() => []);
      setMatches(ms);
    });
  };

  const createCase = () => {
    const validation = validateCase(form);
    if (validation) {
      toast.error(validation);
      return;
    }
    startTransition(async () => {
      try {
        await lostFoundClient.crearCaso({
          ...form,
          fecha_evento: new Date(form.fecha_evento).toISOString(),
          etiquetas: String(form.etiquetas ?? "")
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
        });
        const [nextFeed, nextMine] = await Promise.all([lostFoundClient.feed(), lostFoundClient.misCasos()]);
        setFeed(nextFeed.items);
        setMine(nextMine.items);
        setForm(emptyForm);
        toast.success("Caso registrado");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo registrar");
      }
    });
  };

  const sendComment = () => {
    if (!selected || !comment.trim()) return;
    startTransition(async () => {
      await lostFoundClient.comentar(selected.id, comment.trim());
      const detail = await lostFoundClient.detalle(selected.id);
      setSelected(detail);
      setComment("");
    });
  };

  const respondMatch = (matchId: string, confirmar: boolean) => {
    startTransition(async () => {
      await lostFoundClient.responderMatch(matchId, confirmar);
      if (selected) setMatches(await lostFoundClient.matches(selected.id));
      toast.success(confirmar ? "Match confirmado" : "Match descartado");
    });
  };

  return (
    <div className="space-y-5 px-4 py-5">
      <section className="space-y-2">
        <div className="flex items-center gap-2 text-[#001C55]">
          <PackageSearch className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Lost & Found</h1>
        </div>
        <p className="text-sm text-slate-600">Registra, busca y coordina objetos perdidos o encontrados en campus.</p>
      </section>

      <Tabs defaultValue="feed" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="nuevo">Nuevo</TabsTrigger>
          <TabsTrigger value="mis">Mis casos</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-3">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por objeto, lugar, marca" />
            <Button size="icon" onClick={refreshFeed} disabled={isPending} aria-label="Buscar">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <Select value={tipo || "TODOS"} onValueChange={(value) => setTipo(value === "TODOS" ? "" : (value as "PERDIDO" | "ENCONTRADO"))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="PERDIDO">Perdidos</SelectItem>
              <SelectItem value="ENCONTRADO">Encontrados</SelectItem>
            </SelectContent>
          </Select>
          <CaseList items={feed} onOpen={openDetail} />
        </TabsContent>

        <TabsContent value="nuevo" className="space-y-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Registrar caso</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={form.tipo} onValueChange={(value) => setForm((f) => ({ ...f, tipo: value as "PERDIDO" | "ENCONTRADO" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERDIDO">Objeto perdido</SelectItem>
                  <SelectItem value="ENCONTRADO">Objeto encontrado</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Titulo" value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
              <Textarea placeholder="Descripcion detallada" value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} />
              <Select value={form.categoria_id || undefined} onValueChange={(value) => setForm((f) => ({ ...f, categoria_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>{categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Lugar de referencia" value={form.lugar_referencia} onChange={(e) => setForm((f) => ({ ...f, lugar_referencia: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Color" value={form.color_principal ?? ""} onChange={(e) => setForm((f) => ({ ...f, color_principal: e.target.value }))} />
                <Input placeholder="Marca" value={form.marca ?? ""} onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))} />
              </div>
              <Input placeholder="URL de foto" value={form.foto_url ?? ""} onChange={(e) => setForm((f) => ({ ...f, foto_url: e.target.value }))} />
              <Button className="w-full" onClick={createCase} disabled={isPending || Boolean(validateCase(form))}>Publicar</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mis" className="space-y-3">
          <CaseList items={filteredMine} onOpen={openDetail} />
        </TabsContent>
      </Tabs>

      {selected && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg">{selected.titulo}</CardTitle>
                <p className="text-xs text-slate-500">{selected.codigo} · {selected.lugar_referencia}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setSelected(null)} aria-label="Cerrar detalle"><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selected.foto_url && <img src={selected.foto_url} alt="" className="aspect-video w-full rounded-lg object-cover" />}
            <p className="text-sm text-slate-700">{selected.descripcion}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={estadoLfTone[selected.estado]}>{estadoLabel(selected.estado)}</Badge>
              {selected.categoria_nombre && <Badge variant="secondary">{selected.categoria_nombre}</Badge>}
            </div>
            {matches.length > 0 && (
              <div className="space-y-2">
                <Label>Coincidencias sugeridas</Label>
                {matches.map((m) => (
                  <div key={m.id} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{m.caso_contraparte?.titulo ?? "Caso relacionado"}</p>
                    <p className="text-slate-500">Score {(m.score_total * 100).toFixed(0)}%</p>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" onClick={() => respondMatch(m.id, true)}><Check className="mr-1 h-4 w-4" />Confirmar</Button>
                      <Button size="sm" variant="outline" onClick={() => respondMatch(m.id, false)}>Descartar</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><MessageSquare className="h-4 w-4" />Chat comunitario</Label>
              <div className="space-y-2">
                {selected.comentarios.map((c) => (
                  <div key={c.id} className="rounded-lg bg-slate-50 p-2 text-sm">
                    <p className="font-medium">{c.autor?.nombre_completo ?? "Usuario"}</p>
                    <p>{c.contenido}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Escribe un comentario" />
                <Button onClick={sendComment} disabled={isPending}>Enviar</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CaseList({ items, onOpen }: { items: CasoLfListItem[]; onOpen: (item: CasoLfListItem) => void }) {
  if (!items.length) return <p className="rounded-lg border border-dashed p-4 text-center text-sm text-slate-500">No hay casos para mostrar.</p>;
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <button key={item.id} onClick={() => onOpen(item)} className="w-full text-left">
          <Card className="overflow-hidden">
            {item.foto_url && <img src={item.foto_url} alt="" className="aspect-video w-full object-cover" />}
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-950">{item.titulo}</p>
                  <p className="text-xs text-slate-500">{tipoLabel(item.tipo)} · {item.codigo}</p>
                </div>
                <Badge variant="outline" className={estadoLfTone[item.estado]}>{estadoLabel(item.estado)}</Badge>
              </div>
              <p className="line-clamp-2 text-sm text-slate-600">{item.descripcion}</p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CalendarDays className="h-3.5 w-3.5" />
                <span>{item.lugar_referencia}</span>
              </div>
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  );
}

function validateCase(form: CasoLfCreatePayload) {
  if (form.titulo.trim().length < 3) return "El titulo debe tener al menos 3 caracteres.";
  if (form.descripcion.trim().length < 10) return "La descripcion debe tener al menos 10 caracteres.";
  if (!form.categoria_id) return "Selecciona una categoria.";
  if (form.lugar_referencia.trim().length < 3) return "El lugar de referencia debe tener al menos 3 caracteres.";
  return "";
}
