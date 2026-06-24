"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  cn,
} from "@safecampus/ui-kit";
import {
  Bell,
  BellOff,
  CalendarDays,
  Check,
  ChevronDown,
  History,
  ImagePlus,
  MapPin,
  MessageSquare,
  PackageCheck,
  PackageSearch,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "@safecampus/ui-kit";
import { lostFoundClient, type CasoLfCreatePayload } from "../client";
import { estadoLabel, estadoLfTone, tipoLabel } from "../presentation";
import { EditCaseModal } from "./edit-case-modal";
import type { CasoLfDetail, CasoLfListItem, CategoriaLf, MatchLf, UbicacionMaestra } from "../types";

type Props = {
  categorias: CategoriaLf[];
  initialFeed: CasoLfListItem[];
  initialMine: CasoLfListItem[];
  ubicaciones: UbicacionMaestra[];
};

type Filters = {
  search: string;
  tipo: "" | "PERDIDO" | "ENCONTRADO";
  categoria_id: string;
  lugar: string;
  fecha_desde: string;
  fecha_hasta: string;
  color: string;
};

const DRAFT_KEY = "safecampus:lost-found:draft";
const emptyFilters: Filters = { search: "", tipo: "", categoria_id: "", lugar: "", fecha_desde: "", fecha_hasta: "", color: "" };
const emptyForm: CasoLfCreatePayload = {
  tipo: "PERDIDO",
  titulo: "",
  descripcion: "",
  categoria_id: "",
  lugar_referencia: "",
  fecha_evento: new Date().toISOString().slice(0, 16),
  color_principal: "",
  marca: "",
  etiquetas: [],
};
const commentableStates = new Set(["ABIERTO", "EN_REVISION"]);
const terminalStates = new Set(["CERRADO", "DEVUELTO", "DESCARTADO"]);

export function LostFoundCommunity({ categorias, initialFeed, initialMine, ubicaciones }: Props) {
  const [feed, setFeed] = useState(initialFeed);
  const [mine, setMine] = useState(initialMine);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
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
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState("OTRO");
  const [photos, setPhotos] = useState<File[]>([]);
  const [mineStatus, setMineStatus] = useState("TODOS");
  const [selected, setSelected] = useState<CasoLfDetail | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [matches, setMatches] = useState<MatchLf[]>([]);
  const [comment, setComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [threadSubscribed, setThreadSubscribed] = useState(true);
  const [isPending, startTransition] = useTransition();

  const mineIds = useMemo(() => new Set(mine.map((item) => item.id)), [mine]);
  const filteredMine = useMemo(
    () => mine.filter((item) => mineStatus === "TODOS" || item.estado === mineStatus),
    [mine, mineStatus],
  );

  useEffect(() => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...form, etiquetas: form.etiquetas ?? [] }));
  }, [form]);

  const refreshFeed = (cursor?: string | null, append = false) => {
    startTransition(async () => {
      const params = toFeedParams(filters, cursor ?? null);
      const next = await lostFoundClient.feed(params);
      setFeed((current) => (append ? [...current, ...next.items] : next.items));
      setNextCursor(next.next_cursor ?? null);
    });
  };

  const refreshMine = async () => {
    const nextMine = await lostFoundClient.misCasos();
    setMine(nextMine.items);
  };

  const openDetail = (item: CasoLfListItem) => {
    startTransition(async () => {
      const detail = await lostFoundClient.detalle(item.id);
      setSelected(detail);
      setReplyingTo(null);
      setThreadSubscribed(true);
      await lostFoundClient.actualizarParticipacion(item.id, true, true).catch(() => undefined);
      setMatches(await lostFoundClient.matches(item.id).catch(() => []));
    });
  };

  const createCase = () => {
    const validation = validateCase(form, photos);
    if (validation) {
      toast.error(validation);
      return;
    }
    startTransition(async () => {
      try {
        const created = await lostFoundClient.crearCaso(normalizeCreateForm(form));
        const detail = photos.length ? await lostFoundClient.subirFotosArchivos(created.id, photos) : await lostFoundClient.detalle(created.id);
        const [nextFeed, nextMine] = await Promise.all([lostFoundClient.feed(toFeedParams(filters)), lostFoundClient.misCasos()]);
        setFeed(nextFeed.items);
        setNextCursor(nextFeed.next_cursor ?? null);
        setMine(nextMine.items);
        setSelected(detail);
        setMatches(await lostFoundClient.matches(created.id).catch(() => []));
        setForm(emptyForm);
        setPhotos([]);
        setUbicacionSeleccionada("OTRO");
        window.localStorage.removeItem(DRAFT_KEY);
        toast.success(`Caso ${created.codigo} registrado`);
        requestNotificationPermission();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo registrar el caso");
      }
    });
  };

  const handleUbicacionChange = (value: string) => {
    setUbicacionSeleccionada(value);
    if (value === "OTRO") {
      setForm((current) => ({ ...current, lugar_referencia: "" }));
      return;
    }
    const ubicacion = ubicaciones.find((item) => item.id === value);
    if (ubicacion) setForm((current) => ({ ...current, lugar_referencia: ubicacion.nombre }));
  };

  const handlePhotos = (files: FileList | null) => {
    const next = Array.from(files ?? []).slice(0, 3);
    const error = validatePhotos(next);
    if (error) {
      toast.error(error);
      return;
    }
    setPhotos(next);
  };

  const sendComment = () => {
    if (!selected || !comment.trim()) return;
    startTransition(async () => {
      try {
        await lostFoundClient.comentar(selected.id, comment.trim(), replyingTo);
        setSelected(await lostFoundClient.detalle(selected.id));
        setComment("");
        setReplyingTo(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo publicar el comentario");
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
        refreshFeed();
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
          <SearchFilters filters={filters} categorias={categorias} onChange={setFilters} onSearch={() => refreshFeed()} loading={isPending} />
          <CaseList items={feed} onOpen={openDetail} />
          {nextCursor && (
            <Button variant="outline" className="w-full" onClick={() => refreshFeed(nextCursor, true)} disabled={isPending}>
              <ChevronDown className="mr-2 h-4 w-4" /> Cargar mas
            </Button>
          )}
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
              <Select value={ubicacionSeleccionada} onValueChange={handleUbicacionChange}>
                <SelectTrigger><SelectValue placeholder="Ubicacion" /></SelectTrigger>
                <SelectContent>
                  {ubicaciones.map((ubicacion) => <SelectItem key={ubicacion.id} value={ubicacion.id}>{ubicacion.nombre}</SelectItem>)}
                  <SelectItem value="OTRO">Otro</SelectItem>
                </SelectContent>
              </Select>
              {ubicacionSeleccionada === "OTRO" && (
                <Input placeholder="Lugar de referencia" value={form.lugar_referencia} onChange={(e) => setForm((f) => ({ ...f, lugar_referencia: e.target.value }))} />
              )}
              <Input type="datetime-local" value={toLocalInput(form.fecha_evento)} onChange={(e) => setForm((f) => ({ ...f, fecha_evento: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Color" value={form.color_principal ?? ""} onChange={(e) => setForm((f) => ({ ...f, color_principal: e.target.value }))} />
                <Input placeholder="Marca" value={form.marca ?? ""} onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))} />
              </div>
              <Input
                placeholder="Etiquetas separadas por coma"
                value={Array.isArray(form.etiquetas) ? form.etiquetas.join(", ") : String(form.etiquetas ?? "")}
                onChange={(e) => setForm((f) => ({ ...f, etiquetas: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) }))}
              />
              <Label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-slate-50 text-sm text-slate-600">
                <ImagePlus className="h-5 w-5 text-[#001C55]" />
                {photos.length ? `${photos.length} foto(s) seleccionada(s)` : "Agregar foto principal y hasta 2 adicionales"}
                <Input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple capture="environment" onChange={(e) => handlePhotos(e.target.files)} />
              </Label>
              <Button className="w-full" onClick={createCase} disabled={isPending || Boolean(validateCase(form, photos))}>Publicar caso</Button>
            </CardContent>
          </Card>
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
          <CaseList items={filteredMine} onOpen={openDetail} empty="No tienes casos con ese estado." />
        </TabsContent>
      </Tabs>

      {selected && (
        <CaseDetail
          caso={selected}
          matches={matches}
          isOwn={isOwnSelected}
          canEdit={isOwnSelected}
          onEdit={() => setEditOpen(true)}
          threadSubscribed={threadSubscribed}
          comment={comment}
          loading={isPending}
          onClose={() => setSelected(null)}
          onCommentChange={setComment}
          replyingTo={replyingTo}
          onReply={setReplyingTo}
          onClearReply={() => setReplyingTo(null)}
          onSendComment={sendComment}
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
      )}

      {selected && isOwnSelected && (
        <EditCaseModal
          open={editOpen}
          onOpenChange={setEditOpen}
          caso={selected}
          categorias={categorias}
          onSaved={(saved) => setSelected(saved)}
        />
      )}
    </div>
  );
}

function SearchFilters({ filters, categorias, onChange, onSearch, loading }: {
  filters: Filters;
  categorias: CategoriaLf[];
  onChange: (filters: Filters) => void;
  onSearch: () => void;
  loading: boolean;
}) {
  const patch = (partial: Partial<Filters>) => onChange({ ...filters, ...partial });
  return (
    <Card>
      <CardContent className="space-y-3 p-3">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Input value={filters.search} onChange={(e) => patch({ search: e.target.value })} placeholder="Buscar por objeto, lugar, marca" />
          <Button size="icon" onClick={onSearch} disabled={loading} aria-label="Buscar"><Search className="h-4 w-4" /></Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={filters.tipo || "TODOS"} onValueChange={(value) => patch({ tipo: value === "TODOS" ? "" : value as Filters["tipo"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="PERDIDO">Perdidos</SelectItem>
              <SelectItem value="ENCONTRADO">Encontrados</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.categoria_id || "TODAS"} onValueChange={(value) => patch({ categoria_id: value === "TODAS" ? "" : value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Categorias</SelectItem>
              {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Lugar" value={filters.lugar} onChange={(e) => patch({ lugar: e.target.value })} />
          <Input placeholder="Color" value={filters.color} onChange={(e) => patch({ color: e.target.value })} />
          <Input type="date" value={filters.fecha_desde} onChange={(e) => patch({ fecha_desde: e.target.value })} />
          <Input type="date" value={filters.fecha_hasta} onChange={(e) => patch({ fecha_hasta: e.target.value })} />
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
  replyingTo: string | null;
  loading: boolean;
  onClose: () => void;
  onCommentChange: (value: string) => void;
  onReply: (id: string) => void;
  onClearReply: () => void;
  onSendComment: () => void;
  onDeleteComment: (id: string) => void;
  onRespondMatch: (matchId: string, confirmar: boolean) => void;
  onCancel: () => void;
  onToggleParticipation: (checked: boolean) => void;
}) {
  const { caso, matches, isOwn, canEdit, onEdit, threadSubscribed, comment, replyingTo, loading, onClose, onCommentChange, onReply, onClearReply, onSendComment, onDeleteComment, onRespondMatch, onCancel, onToggleParticipation } = props;
  const canComment = commentableStates.has(caso.estado);
  const canCancel = isOwn && !terminalStates.has(caso.estado);
  const rootComments = caso.comentarios.filter((comentario) => !comentario.parent_id);
  const repliesByParent = new Map<string, typeof caso.comentarios>();
  caso.comentarios.filter((comentario) => comentario.parent_id).forEach((comentario) => {
    const replies = repliesByParent.get(comentario.parent_id!) ?? [];
    replies.push(comentario);
    repliesByParent.set(comentario.parent_id!, replies);
  });
  const replyingComment = replyingTo ? caso.comentarios.find((item) => item.id === replyingTo) : null;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{caso.titulo}</CardTitle>
            <p className="text-xs text-slate-500">{caso.codigo} · {caso.lugar_referencia}</p>
          </div>
          <div className="flex items-center gap-1">
            {canEdit && onEdit && (
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Pencil className="mr-1.5 h-4 w-4" />
                Editar
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={onClose} aria-label="Cerrar detalle"><X className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {caso.foto_url && <Photo src={caso.foto_url} />}
        {caso.foto_adicional_urls.length > 0 && (
          <div className="grid grid-cols-3 gap-2">{caso.foto_adicional_urls.map((src) => <Photo key={src} src={src} small />)}</div>
        )}
        <p className="text-sm text-slate-700">{caso.descripcion}</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={estadoLfTone[caso.estado]}>{estadoLabel(caso.estado)}</Badge>
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

        {isOwn && caso.historial.length > 0 && (
          <section className="space-y-2">
            <Label className="flex items-center gap-1"><History className="h-4 w-4" />Historial</Label>
            <div className="space-y-2">
              {caso.historial.map((item) => (
                <div key={item.id} className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                  <p className="font-medium text-slate-800">{estadoLabel(item.estado_nuevo)} · {item.accion}</p>
                  <p>{formatDate(item.created_at)}{item.comentario ? ` · ${item.comentario}` : ""}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <Separator />

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label className="flex items-center gap-1"><MessageSquare className="h-4 w-4" />Chat comunitario</Label>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {threadSubscribed ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
              <Switch checked={threadSubscribed} onCheckedChange={onToggleParticipation} />
            </div>
          </div>
          <div className="space-y-2">
            {rootComments.length === 0 ? (
              <p className="rounded-lg border border-dashed p-3 text-sm text-slate-500">Sin comentarios aun.</p>
            ) : rootComments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                replies={repliesByParent.get(c.id) ?? []}
                canComment={canComment}
                onReply={onReply}
                onDelete={onDeleteComment}
              />
            ))}
          </div>
          {replyingComment && (
            <div className="flex items-center justify-between rounded-lg bg-[#001C55]/5 px-3 py-2 text-xs text-[#001C55]">
              <span>Respondiendo a {replyingComment.autor?.nombre_completo ?? "comentario"}</span>
              <Button size="sm" variant="ghost" onClick={onClearReply}>Cancelar</Button>
            </div>
          )}
          <div className="flex gap-2">
            <Input value={comment} onChange={(e) => onCommentChange(e.target.value)} placeholder={canComment ? "Escribe un comentario" : "Chat en solo lectura"} disabled={!canComment} />
            <Button onClick={onSendComment} disabled={loading || !canComment || !comment.trim()}>Enviar</Button>
          </div>
        </section>

        {canCancel && (
          <Button variant="outline" className="w-full border-rose-200 text-rose-700 hover:bg-rose-50" onClick={onCancel} disabled={loading}>
            <Trash2 className="mr-2 h-4 w-4" /> Cancelar mi caso
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function CommentItem({ comment, replies, canComment, onReply, onDelete }: {
  comment: CasoLfDetail["comentarios"][number];
  replies: CasoLfDetail["comentarios"];
  canComment: boolean;
  onReply: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="rounded-lg bg-slate-50 p-2 text-sm">
        <p className="font-medium">{comment.autor?.nombre_completo ?? "Usuario"}{comment.autor?.rol ? ` · ${comment.autor.rol}` : ""}</p>
        <p>{comment.contenido}</p>
        <div className="mt-2 flex gap-2">
          {canComment && <Button size="sm" variant="ghost" onClick={() => onReply(comment.id)}>Responder</Button>}
          {comment.puede_eliminar && <Button size="sm" variant="ghost" className="text-rose-700" onClick={() => onDelete(comment.id)}>Eliminar</Button>}
        </div>
      </div>
      {replies.length > 0 && (
        <div className="ml-4 space-y-2 border-l pl-3">
          {replies.map((reply) => (
            <div key={reply.id} className="rounded-lg bg-white p-2 text-sm shadow-sm ring-1 ring-slate-100">
              <p className="font-medium">{reply.autor?.nombre_completo ?? "Usuario"}{reply.autor?.rol ? ` · ${reply.autor.rol}` : ""}</p>
              <p>{reply.contenido}</p>
              {reply.puede_eliminar && (
                <Button size="sm" variant="ghost" className="mt-2 text-rose-700" onClick={() => onDelete(reply.id)}>Eliminar</Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CaseList({ items, onOpen, empty = "No hay casos para mostrar." }: { items: CasoLfListItem[]; onOpen: (item: CasoLfListItem) => void; empty?: string }) {
  if (!items.length) return <p className="rounded-lg border border-dashed p-4 text-center text-sm text-slate-500">{empty}</p>;
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <button key={item.id} onClick={() => onOpen(item)} className="w-full text-left">
          <Card className="overflow-hidden transition active:scale-[0.99]">
            {item.foto_url && <Photo src={item.foto_url} />}
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-950">{item.titulo}</p>
                  <p className="text-xs text-slate-500">{tipoLabel(item.tipo)} · {item.codigo}</p>
                </div>
                <Badge variant="outline" className={estadoLfTone[item.estado]}>{estadoLabel(item.estado)}</Badge>
              </div>
              <p className="line-clamp-2 text-sm text-slate-600">{item.descripcion}</p>
              <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{item.lugar_referencia}</span>
                <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(item.fecha_evento ?? item.created_at)}</span>
                {item.conteo_comentarios > 0 && <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" />{item.conteo_comentarios}</span>}
              </div>
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  );
}

function Photo({ src, small = false }: { src: string; small?: boolean }) {
  return (
    <div className={cn("relative w-full overflow-hidden bg-slate-100", small ? "aspect-square rounded-md" : "aspect-video")}>
      <Image src={src} alt="" fill unoptimized className="object-cover" />
    </div>
  );
}

function toFeedParams(filters: Filters, cursor?: string | null) {
  return Object.fromEntries(Object.entries({
    search: filters.search,
    tipo: filters.tipo,
    categoria_id: filters.categoria_id,
    lugar: filters.lugar,
    fecha_desde: filters.fecha_desde ? new Date(filters.fecha_desde).toISOString() : "",
    fecha_hasta: filters.fecha_hasta ? new Date(`${filters.fecha_hasta}T23:59:59`).toISOString() : "",
    color: filters.color,
    cursor: cursor ?? "",
  }).filter(([, value]) => value)) as Record<string, string>;
}

function normalizeCreateForm(form: CasoLfCreatePayload): CasoLfCreatePayload {
  return {
    ...form,
    fecha_evento: new Date(form.fecha_evento).toISOString(),
    etiquetas: Array.isArray(form.etiquetas) ? form.etiquetas : String(form.etiquetas ?? "").split(",").map((x) => x.trim()).filter(Boolean),
  };
}

function validateCase(form: CasoLfCreatePayload, photos: File[]) {
  if (form.titulo.trim().length < 3) return "El titulo debe tener al menos 3 caracteres.";
  if (form.descripcion.trim().length < 20) return "La descripcion debe tener al menos 20 caracteres.";
  if (!form.categoria_id) return "Selecciona una categoria.";
  if (form.lugar_referencia.trim().length < 3) return "El lugar de referencia debe tener al menos 3 caracteres.";
  const eventDate = new Date(form.fecha_evento);
  const now = new Date();
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(now.getDate() - 90);
  if (Number.isNaN(eventDate.getTime())) return "Selecciona una fecha valida.";
  if (eventDate > now) return "La fecha no puede ser futura.";
  if (eventDate < ninetyDaysAgo) return "La fecha no puede ser anterior a 90 dias.";
  return validatePhotos(photos, true);
}

function validatePhotos(files: File[], required = false) {
  if (required && files.length === 0) return "Agrega al menos una foto.";
  if (files.length > 3) return "Solo puedes adjuntar hasta 3 fotos.";
  for (const file of files) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return "Solo se aceptan imagenes JPG, PNG o WEBP.";
    if (file.size < 50 * 1024) return "Cada imagen debe pesar al menos 50 KB.";
    if (file.size > 10 * 1024 * 1024) return "Cada imagen debe pesar como maximo 10 MB.";
  }
  return "";
}

function toLocalInput(value: string) {
  return value.includes("T") ? value.slice(0, 16) : value;
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "default") return;
  Notification.requestPermission().catch(() => undefined);
}
