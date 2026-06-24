"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState, useTransition } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  Input,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@safecampus/ui-kit";
import { Archive, CheckCircle2, Eye, EyeOff, GitCompareArrows, History, ImageIcon, Lock, LockOpen, MapPin, MessageSquare, Pencil, Settings2, XCircle } from "lucide-react";
import { toast } from "@safecampus/ui-kit";
import { lostFoundClient } from "../client";
import { estadoLabel, estadoLfTone, tipoLabel } from "../presentation";
import { EditCaseModal } from "./edit-case-modal";
import { CommentComposer, CommentNode, type CommentCallbacks } from "./comment-node";
import { activeMetadatoCampos } from "./metadato-fields";
import type { CasoLfDetail, CategoriaLf, ComentarioLf, MatchLf } from "../types";

const DEFAULT_MAX_DEPTH = 6;

type CurrentUser = { id: string; isAdmin: boolean } | null;

const COMMENTABLE_STATES = new Set(["ABIERTO", "EN_REVISION"]);

const LostFoundReadonlyMap = dynamic(
  () => import("./lost-found-readonly-map").then((mod) => mod.LostFoundReadonlyMap),
  { ssr: false },
);

export function LostFoundThreadDetail({
  initialCase,
  initialMatches,
  categorias = [],
  currentUser = null,
}: {
  initialCase: CasoLfDetail;
  initialMatches: MatchLf[];
  categorias?: CategoriaLf[];
  currentUser?: CurrentUser;
}) {
  const [caso, setCaso] = useState(initialCase);
  const [manageMode, setManageMode] = useState(false);
  const [operativo, setOperativo] = useState("");
  const [custodia, setCustodia] = useState("");
  const [matches, setMatches] = useState<MatchLf[]>(initialMatches);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isAdmin = Boolean(currentUser?.isAdmin);
  const canEdit = Boolean(currentUser?.isAdmin || (currentUser && caso.reportante?.id === currentUser.id));
  const cerrado = caso.estado === "CERRADO";
  const canComment = COMMENTABLE_STATES.has(caso.estado);
  const metaEntries = activeMetadatoCampos(categorias.find((c) => c.id === caso.categoria_id))
    .map((campo) => ({ etiqueta: campo.etiqueta, valor: caso.metadatos?.[campo.codigo] }))
    .filter((entry) => entry.valor !== undefined && entry.valor !== null && String(entry.valor).trim() !== "");

  const reload = async () => setCaso(await lostFoundClient.detalle(caso.id));
  const reloadMatches = async () => setMatches(await lostFoundClient.matches(caso.id));

  const maxDepth = caso.comentarios_profundidad_maxima ?? DEFAULT_MAX_DEPTH;
  const childrenMap = useMemo(() => buildChildrenMap(caso.comentarios), [caso.comentarios]);
  const rootComments = useMemo(() => {
    const ids = new Set(caso.comentarios.map((c) => c.id));
    // Un comentario es raíz si no tiene padre o su padre no está en el conjunto visible (huérfano).
    return caso.comentarios.filter((c) => !c.parent_id || !ids.has(c.parent_id));
  }, [caso.comentarios]);

  const submitComment = (texto: string, archivos: File[], parentId?: string | null): Promise<boolean> =>
    new Promise((resolve) => {
      if (!canComment) {
        resolve(false);
        return;
      }
      startTransition(async () => {
        try {
          await lostFoundClient.comentar(caso.id, texto, parentId ?? null, archivos);
          await reload();
          resolve(true);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "No se pudo enviar el comentario");
          resolve(false);
        }
      });
    });

  const commentCallbacks: CommentCallbacks = {
    onReply: (parentId, texto, archivos) => submitComment(texto, archivos, parentId),
    onEdit: (id, texto) =>
      new Promise((resolve) => {
        startTransition(async () => {
          try {
            await lostFoundClient.editarComentario(id, texto);
            await reload();
            toast.success("Comentario actualizado");
            resolve(true);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo editar el comentario");
            resolve(false);
          }
        });
      }),
    onModerate: (id, visible) =>
      new Promise((resolve) => {
        startTransition(async () => {
          try {
            await lostFoundClient.moderarComentario(id, visible, visible ? "Restaurado por supervision" : "Ocultado por moderacion");
            await reload();
            toast.success(visible ? "Comentario restaurado" : "Comentario ocultado");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo actualizar la visibilidad");
          }
          resolve();
        });
      }),
    onDelete: (id) =>
      new Promise((resolve) => {
        startTransition(async () => {
          try {
            await lostFoundClient.eliminarComentarioGestion(id);
            await reload();
            toast.success("Comentario eliminado");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo eliminar el comentario");
          }
          resolve();
        });
      }),
  };

  const toggleCierre = () => {
    startTransition(async () => {
      try {
        const saved = await lostFoundClient.cerrarReabrirCaso(caso.id, !cerrado);
        setCaso(saved);
        toast.success(cerrado ? "Hilo reabierto" : "Hilo cerrado");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo actualizar el hilo");
      }
    });
  };

  const toggleVisibilidad = () => {
    const nuevoOculto = !caso.oculto;
    startTransition(async () => {
      try {
        const saved = await lostFoundClient.ocultarMostrarCaso(caso.id, nuevoOculto);
        setCaso(saved);
        toast.success(nuevoOculto ? "Hilo oculto para la comunidad" : "Hilo visible para la comunidad");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo actualizar la visibilidad");
      }
    });
  };

  const changeState = (estado: string) => {
    startTransition(async () => {
      await lostFoundClient.cambiarEstado(caso.id, estado, operativo || undefined);
      await reload();
      toast.success("Estado actualizado");
    });
  };

  const createCustody = () => {
    if (!custodia.trim()) return;
    startTransition(async () => {
      await lostFoundClient.registrarCustodia(caso.id, {
        ubicacion_custodia: custodia.trim(),
        observaciones: operativo || undefined,
      });
      await reload();
      setCustodia("");
      toast.success("Custodia registrada");
    });
  };

  const respondMatch = (match: MatchLf, confirmar: boolean) => {
    startTransition(async () => {
      await lostFoundClient.responderMatch(match.id, confirmar, confirmar ? "Confirmado desde detalle del hilo" : "Descartado desde detalle del hilo");
      await Promise.all([reload(), reloadMatches()]);
      toast.success(confirmar ? "Coincidencia confirmada" : "Coincidencia descartada");
    });
  };

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-950">{caso.titulo}</h1>
            {cerrado && <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-600">Cerrado</Badge>}
            {caso.oculto && <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Oculto</Badge>}
          </div>
          <p className="text-sm text-slate-500">{caso.codigo} · {caso.lugar_referencia}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              <Button variant="outline" onClick={toggleCierre} disabled={isPending}>
                {cerrado ? <LockOpen className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                {cerrado ? "Reabrir" : "Cerrar"}
              </Button>
              <Button variant="outline" onClick={toggleVisibilidad} disabled={isPending}>
                {caso.oculto ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                {caso.oculto ? "Mostrar" : "Ocultar"}
              </Button>
            </>
          )}
          {canEdit && (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar hilo
            </Button>
          )}
        </div>
      </div>

      {canEdit && (
        <EditCaseModal
          open={editOpen}
          onOpenChange={setEditOpen}
          caso={caso}
          categorias={categorias}
          onSaved={setCaso}
        />
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader><CardTitle>Publicacion</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <CaseMediaTabs caso={caso} />
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={estadoLfTone[caso.estado]}>{estadoLabel(caso.estado)}</Badge>
              <Badge variant="secondary">{tipoLabel(caso.tipo)}</Badge>
              {caso.categoria_nombre && <Badge variant="outline">{caso.categoria_nombre}</Badge>}
            </div>
            <p className="text-sm text-slate-700">{caso.descripcion}</p>
            {metaEntries.length > 0 && (
              <div className="rounded-lg border bg-slate-50/60 p-3">
                <p className="mb-2 text-xs font-semibold text-slate-600">Detalles de la categoría</p>
                <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
                  {metaEntries.map((entry) => (
                    <div key={entry.etiqueta} className="flex justify-between gap-3 text-sm">
                      <dt className="text-slate-500">{entry.etiqueta}</dt>
                      <dd className="text-right font-medium text-slate-800">{String(entry.valor)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            <p className="text-sm text-slate-500">Reportante: {caso.reportante?.nombre_completo ?? "Usuario"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Gestion operativa</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Textarea value={operativo} onChange={(e) => setOperativo(e.target.value)} placeholder="Nota operativa" />
            <Select onValueChange={changeState}>
              <SelectTrigger><SelectValue placeholder="Cambiar estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EN_REVISION">En revision</SelectItem>
                <SelectItem value="CONFIRMADO">Confirmado</SelectItem>
                <SelectItem value="CERRADO">Cerrar</SelectItem>
              </SelectContent>
            </Select>
            <Input value={custodia} onChange={(e) => setCustodia(e.target.value)} placeholder="Ubicacion de custodia" />
            <Button className="w-full" onClick={createCustody} disabled={isPending}>
              <Archive className="mr-2 h-4 w-4" />
              Registrar custodia
            </Button>
            <Button className="w-full" variant="outline" onClick={() => setHistoryOpen(true)}>
              <History className="mr-2 h-4 w-4" />
              Ver historial del caso
            </Button>

            <aside className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">Resumen del hilo</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Comentarios</dt><dd className="font-medium">{caso.comentarios.length}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Estado</dt><dd className="font-medium">{estadoLabel(caso.estado)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Tipo</dt><dd className="font-medium">{tipoLabel(caso.tipo)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Lugar</dt><dd className="text-right font-medium">{caso.lugar_referencia}</dd></div>
              </dl>
            </aside>
          </CardContent>
        </Card>
      </div>

      {false && (
        <>
        <CardHeader><CardTitle>Historial del caso</CardTitle></CardHeader>
        <CardContent>
          {caso.historial.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-slate-500">Aun no hay transiciones registradas.</p>
          ) : (
            <div className="space-y-0">
              {caso.historial.map((item, index) => (
                <div key={item.id} className="grid grid-cols-[18px_1fr] gap-3">
                  <div className="flex flex-col items-center">
                    <span className="mt-1 h-3 w-3 rounded-full bg-[#001C55]" />
                    {index < caso.historial.length - 1 && <span className="h-full min-h-10 w-px bg-slate-200" />}
                  </div>
                  <div className="pb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={estadoLfTone[item.estado_nuevo]}>{estadoLabel(item.estado_nuevo)}</Badge>
                      {item.estado_anterior && <span className="text-xs text-slate-500">desde {estadoLabel(item.estado_anterior)}</span>}
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-950">{item.accion}</p>
                    {item.comentario && <p className="text-sm text-slate-600">{item.comentario}</p>}
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(item.created_at).toLocaleString()} · {item.ejecutado_por?.nombre_completo ?? "Sistema"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        </>
      )}
      <HistoryDrawer open={historyOpen} onOpenChange={setHistoryOpen} caso={caso} />

      {matches.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><GitCompareArrows className="h-5 w-5" />Coincidencias sugeridas</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
              <div className="flex gap-3 pb-3">
                {matches.map((match) => {
                  const candidate = match.caso_contraparte;
                  return (
                    <div key={match.id} className="w-80 shrink-0 rounded-lg border bg-white p-3">
                      <div className="flex gap-3">
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-slate-50">
                          {candidate?.foto_url ? <Image src={candidate.foto_url} alt="" fill unoptimized className="object-cover" /> : <GitCompareArrows className="m-6 h-8 w-8 text-slate-400" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 font-medium text-slate-950">{candidate?.titulo ?? "Caso candidato"}</p>
                          <p className="text-xs text-slate-500">{candidate?.codigo} · {candidate?.lugar_referencia}</p>
                          <Badge variant="outline" className="mt-2 border-sky-200 bg-sky-50 text-sky-700">Score {Math.round(match.score_total * 100)}%</Badge>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        {candidate && (
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/lost-found-hilos/${candidate.id}`}>Ver detalle</Link>
                          </Button>
                        )}
                        <Button size="sm" onClick={() => respondMatch(match, true)} disabled={isPending}>
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          Confirmar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => respondMatch(match, false)} disabled={isPending}>
                          <XCircle className="mr-1 h-4 w-4" />
                          Descartar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />Hilo de conversacion</CardTitle>
            {isAdmin && (
              <Button
                size="sm"
                variant={manageMode ? "secondary" : "outline"}
                onClick={() => setManageMode((v) => !v)}
              >
                <Settings2 className="mr-1 h-4 w-4" />
                {manageMode ? "Salir de gestión" : "Modo gestión"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mx-auto max-w-3xl space-y-3">
            {!canComment && (
              <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                {cerrado ? "Este hilo está cerrado: no se admiten nuevos comentarios." : "Este hilo no admite comentarios en su estado actual."}
              </p>
            )}
            {canComment && (
              <CommentComposer
                placeholder="Escribe un comentario… (puedes adjuntar hasta 3 imágenes)"
                isPending={isPending}
                onSubmit={(texto, archivos) => submitComment(texto, archivos, null)}
              />
            )}

            <div className="space-y-3">
              {rootComments.map((item) => (
                <CommentNode
                  key={item.id}
                  comment={item}
                  childrenMap={childrenMap}
                  depth={0}
                  maxDepth={maxDepth}
                  manageMode={manageMode}
                  canComment={canComment}
                  isPending={isPending}
                  callbacks={commentCallbacks}
                />
              ))}
            </div>
            {caso.comentarios.length === 0 && (
              <p className="rounded-lg border border-dashed p-4 text-sm text-slate-500">Este hilo aun no tiene comentarios.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function buildChildrenMap(comentarios: ComentarioLf[]): Map<string, ComentarioLf[]> {
  const map = new Map<string, ComentarioLf[]>();
  for (const comentario of comentarios) {
    if (!comentario.parent_id) continue;
    const list = map.get(comentario.parent_id) ?? [];
    list.push(comentario);
    map.set(comentario.parent_id, list);
  }
  return map;
}

function CaseMediaTabs({ caso }: { caso: CasoLfDetail }) {
  const photos = [caso.foto_url, ...caso.foto_adicional_urls].filter(Boolean) as string[];
  const hasCoordinates = caso.latitud != null && caso.longitud != null;

  return (
    <Tabs defaultValue="imagenes" className="w-full">
      <TabsList>
        <TabsTrigger value="imagenes"><ImageIcon className="mr-2 h-4 w-4" />Imagenes</TabsTrigger>
        <TabsTrigger value="mapa" disabled={!hasCoordinates}><MapPin className="mr-2 h-4 w-4" />Mapa</TabsTrigger>
      </TabsList>
      <TabsContent value="imagenes" className="mt-4 space-y-3">
        {photos.length === 0 ? (
          <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed bg-slate-50 text-sm text-slate-500">
            Sin imagenes registradas.
          </div>
        ) : photos.length === 1 ? (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-slate-50">
            <Image src={photos[0]!} alt="" fill unoptimized className="object-cover" />
          </div>
        ) : (
          <div className="px-10">
            <Carousel className="w-full" opts={{ loop: true }}>
              <CarouselContent>
                {photos.map((url) => (
                  <CarouselItem key={url}>
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-slate-50">
                      <Image src={url} alt="" fill unoptimized className="object-cover" />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        )}
      </TabsContent>
      <TabsContent value="mapa" className="mt-4">
        {hasCoordinates ? (
          <div className="overflow-hidden rounded-lg border">
            <LostFoundReadonlyMap lat={caso.latitud!} lng={caso.longitud!} />
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-sm text-slate-500">Este caso no tiene coordenadas registradas.</div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function HistoryDrawer({ open, onOpenChange, caso }: { open: boolean; onOpenChange: (open: boolean) => void; caso: CasoLfDetail }) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="h-full overflow-hidden p-0 sm:max-w-xl">
        <DrawerHeader className="border-b px-6 py-5 text-left">
          <DrawerTitle>Historial del caso</DrawerTitle>
          <DrawerDescription>Transiciones de estado, actor y motivo registrado.</DrawerDescription>
        </DrawerHeader>
        <ScrollArea className="h-full px-6 py-5">
          {caso.historial.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-slate-500">Aun no hay transiciones registradas.</p>
          ) : (
            <div className="space-y-0">
              {caso.historial.map((item, index) => (
                <div key={item.id} className="grid grid-cols-[18px_1fr] gap-3">
                  <div className="flex flex-col items-center">
                    <span className="mt-1 h-3 w-3 rounded-full bg-[#001C55]" />
                    {index < caso.historial.length - 1 && <span className="h-full min-h-10 w-px bg-slate-200" />}
                  </div>
                  <div className="pb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={estadoLfTone[item.estado_nuevo]}>{estadoLabel(item.estado_nuevo)}</Badge>
                      {item.estado_anterior && <span className="text-xs text-slate-500">desde {estadoLabel(item.estado_anterior)}</span>}
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-950">{item.accion}</p>
                    {item.comentario && <p className="text-sm text-slate-600">{item.comentario}</p>}
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(item.created_at).toLocaleString()} - {item.ejecutado_por?.nombre_completo ?? "Sistema"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
