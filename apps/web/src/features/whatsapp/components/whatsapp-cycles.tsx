"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  ScrollArea,
  SearchInput,
  cn,
} from "@safecampus/ui-kit";
import { ExternalLink, ImageIcon, MessageSquareText, RefreshCw, RotateCcw } from "lucide-react";

import { api } from "@/lib/api/client";
import { formatLimaDateTime } from "@/lib/lima-date";
import type {
  ConversationCycleDetail,
  ConversationCycleListItem,
  ConversationCyclesDetail,
  ConversationCyclesListResponse,
  ConversationCycleSummary,
  ConversationMessage,
} from "../types";

function normalizePhone(value: string | null | undefined) {
  const raw = value || "";
  const digits = raw.split("@")[0]?.replace(/\D/g, "") || "";
  if (digits.startsWith("51") && digits.length === 11) {
    return `(51) ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  if (digits.length > 6) return `+${digits}`;
  return raw || "Contacto WhatsApp";
}

function contactName(conversation: Pick<ConversationCycleSummary, "nombre_contacto" | "telefono_contacto" | "external_chat_id">) {
  return conversation.nombre_contacto || normalizePhone(conversation.telefono_contacto || conversation.external_chat_id);
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDateTime(value: string | null | undefined) {
  return formatLimaDateTime(value, {
    dateStyle: "medium",
    timeStyle: "short",
  }, "Sin fecha");
}

function cycleTone(state: ConversationCycleListItem["estado"]) {
  return state === "ACTIVO"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-slate-300 bg-slate-100 text-slate-700";
}

function WhatsAppIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return <img src="/icon-whatsapp.svg" alt="" aria-hidden="true" className={className} />;
}

export function WhatsAppCycles() {
  const [items, setItems] = useState<ConversationCycleSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationCyclesDetail | null>(null);
  const [cycleDetail, setCycleDetail] = useState<ConversationCycleDetail | null>(null);
  const [search, setSearch] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const loadItems = useCallback(async () => {
    const params: Record<string, string> = { limit: "100" };
    if (search.trim()) params.search = search.trim();
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    const response = await api.get<ConversationCyclesListResponse>(
      "/omnicanal/ciclos/conversaciones",
      { params },
    );
    setItems(response.items);
    setErrorMessage(null);
    setSelectedId((current) => {
      if (current && response.items.some((item) => item.id === current)) return current;
      return response.items[0]?.id ?? null;
    });
  }, [desde, hasta, search]);

  const loadDetail = useCallback(async (conversationId: string) => {
    setLoadingDetail(true);
    try {
      const response = await api.get<ConversationCyclesDetail>(
        `/omnicanal/ciclos/conversaciones/${conversationId}`,
      );
      setDetail(response);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar ciclos.");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  async function openCycle(cycleId: string) {
    const response = await api.get<ConversationCycleDetail>(`/omnicanal/ciclos/${cycleId}`);
    setCycleDetail(response);
  }

  async function reopenCycle(cycleId: string) {
    await api.post(`/omnicanal/ciclos/${cycleId}/reabrir`);
    setCycleDetail(null);
    await loadItems();
    if (selectedId) await loadDetail(selectedId);
  }

  useEffect(() => {
    setLoadingList(true);
    loadItems()
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar ciclos.");
      })
      .finally(() => setLoadingList(false));
  }, [loadItems]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedId);
  }, [loadDetail, selectedId]);

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-180 flex-col bg-slate-50 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ciclos de atención</h1>
        </div>
        <Button variant="outline" onClick={() => void loadItems()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </header>

      {errorMessage ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {errorMessage}
        </div>
      ) : null}

      <main className="mt-5 grid min-h-0 flex-1 grid-cols-[390px_minmax(0,1fr)] overflow-hidden rounded-xl border bg-white">
        <aside className="flex min-h-0 flex-col border-r bg-white">
          <div className="space-y-3 border-b p-4">
            <SearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar contacto o numero"
              className="border-0 bg-slate-100"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={desde} onChange={(event) => setDesde(event.target.value)} />
              <Input type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} />
            </div>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-2 p-3">
              {loadingList ? <p className="p-4 text-sm text-slate-500">Cargando ciclos...</p> : null}
              {items.map((item) => (
                <CycleConversationCard
                  key={item.id}
                  item={item}
                  active={item.id === selectedId}
                  onClick={() => setSelectedId(item.id)}
                />
              ))}
              {!loadingList && items.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
                  No hay ciclos registrados con esos filtros.
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </aside>

        <section className="min-h-0 bg-slate-50">
          <ScrollArea className="h-full">
            <div className="mx-auto max-w-5xl space-y-4 p-6">
              {detail ? (
                <>
                  <CycleConversationSummary item={detail.conversacion} fallback={selectedItem} />
                  <CycleList
                    items={detail.ciclos}
                    loading={loadingDetail}
                    onOpen={(cycleId) => void openCycle(cycleId)}
                  />
                </>
              ) : (
                <div className="flex min-h-96 items-center justify-center rounded-lg border border-dashed bg-white text-sm text-slate-500">
                  Selecciona un contacto para ver sus ciclos.
                </div>
              )}
            </div>
          </ScrollArea>
        </section>
      </main>

      <CycleDetailDialog
        detail={cycleDetail}
        onOpenChange={(open) => {
          if (!open) setCycleDetail(null);
        }}
        onReopen={(cycleId) => void reopenCycle(cycleId)}
      />
    </div>
  );
}

function CycleConversationCard({
  item,
  active,
  onClick,
}: {
  item: ConversationCycleSummary;
  active: boolean;
  onClick: () => void;
}) {
  const name = contactName(item);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border p-3 text-left transition",
        active
          ? "border-[#001C55] bg-[#001C55]/5 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-[#001C55]/10 text-[#001C55]">{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-950">{name}</p>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                <WhatsAppIcon />
                <span className="truncate">{normalizePhone(item.telefono_contacto || item.external_chat_id)}</span>
              </div>
            </div>
            <Badge variant="outline">{item.ciclos_count}</Badge>
          </div>
          <p className="mt-2 text-xs text-slate-500">{formatDateTime(item.ultimo_ciclo_at)}</p>
        </div>
      </div>
    </button>
  );
}

function CycleConversationSummary({
  item,
  fallback,
}: {
  item: ConversationCycleSummary;
  fallback: ConversationCycleSummary | null;
}) {
  const name = contactName(item);
  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-slate-500">Contacto</p>
          <h2 className="mt-1 truncate text-xl font-bold text-slate-950">{name}</h2>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <WhatsAppIcon className="h-4 w-4" />
            <span>{normalizePhone(item.telefono_contacto || item.external_chat_id)}</span>
          </div>
        </div>
        <Badge variant="outline">{item.ciclos_count || fallback?.ciclos_count || 0} ciclos</Badge>
      </div>
    </div>
  );
}

export function CycleList({
  items,
  loading,
  onOpen,
}: {
  items: ConversationCycleListItem[];
  loading: boolean;
  onOpen: (cycleId: string) => void;
}) {
  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="flex items-center gap-2">
        <MessageSquareText className="h-4 w-4 text-[#001C55]" />
        <h3 className="font-semibold text-slate-950">Ciclos registrados</h3>
      </div>
      {loading ? <p className="mt-4 text-sm text-slate-500">Actualizando ciclos...</p> : null}
      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen(item.id)}
            className="w-full rounded-lg border bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-white"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={cn("border", cycleTone(item.estado))}>{item.estado}</Badge>
                  <Badge variant="outline">{item.cierre_tipo}</Badge>
                  {item.imagenes_count ? (
                    <Badge variant="outline">
                      <ImageIcon className="mr-1 h-3.5 w-3.5" />
                      {item.imagenes_count}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-2 font-semibold text-slate-950">
                  {formatDateTime(item.started_at)} - {item.closed_at ? formatDateTime(item.closed_at) : "activo"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {item.mensajes_count} mensajes
                  {item.incidente ? ` · ${item.incidente.codigo}` : " · sin incidente asociado"}
                </p>
              </div>
              <span className="inline-flex h-8 items-center justify-center rounded-md border bg-white px-3 text-sm font-medium text-slate-900 shadow-xs">
                Ver detalle
              </span>
            </div>
          </button>
        ))}
        {!loading && items.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
            Este contacto aun no tiene ciclos registrados.
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CycleDetailDialog({
  detail,
  onOpenChange,
  onReopen,
}: {
  detail: ConversationCycleDetail | null;
  onOpenChange: (open: boolean) => void;
  onReopen: (cycleId: string) => void;
}) {
  const cycle = detail?.ciclo;
  return (
    <Dialog open={Boolean(detail)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden p-0 sm:max-w-4xl">
        {detail && cycle ? (
          <>
            <DialogHeader className="border-b p-5">
              <DialogTitle>Ciclo de atención</DialogTitle>
              <DialogDescription>
                {formatDateTime(cycle.started_at)} - {cycle.closed_at ? formatDateTime(cycle.closed_at) : "activo"}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-92px)]">
              <div className="space-y-5 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-slate-50 p-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge className={cn("border", cycleTone(cycle.estado))}>{cycle.estado}</Badge>
                    <Badge variant="outline">{cycle.mensajes_count} mensajes</Badge>
                    <Badge variant="outline">{cycle.imagenes_count} imagenes</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cycle.incidente ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/incidentes/${cycle.incidente.id}`}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Incidente
                        </Link>
                      </Button>
                    ) : null}
                    {cycle.estado === "CERRADO" ? (
                      <Button size="sm" onClick={() => onReopen(cycle.id)}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reabrir
                      </Button>
                    ) : null}
                  </div>
                </div>
                <SnapshotBlock title="Resumen IA" data={detail.clasificacion_snapshot} />
                <div className="rounded-lg border bg-white p-4">
                  <h3 className="font-semibold text-slate-950">Conversación archivada</h3>
                  <div className="mt-4 space-y-3">
                    {detail.mensajes.map((message) => (
                      <ArchivedMessage key={message.id} message={message} />
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SnapshotBlock({ title, data }: { title: string; data: Record<string, unknown> }) {
  const entries = Object.entries(data || {}).filter(([, value]) => value !== null && value !== undefined && value !== "");
  if (!entries.length) return null;
  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="font-semibold text-slate-950">{title}</h3>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-[180px_minmax(0,1fr)]">
        {entries.map(([key, value]) => (
          <div key={key} className="contents">
            <p className="text-xs font-medium uppercase text-slate-500">{key.replaceAll("_", " ")}</p>
            <p className="break-words font-medium text-slate-900">
              {typeof value === "object" ? JSON.stringify(value) : String(value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArchivedMessage({ message }: { message: ConversationMessage }) {
  const outgoing = message.direccion === "OUTBOUND";
  const mediaSrc = message.media?.data_url || message.media?.url || message.media?.thumbnail_data_url;
  return (
    <div className={cn("flex", outgoing ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[78%] rounded-xl border px-3 py-2 text-sm",
          outgoing ? "border-indigo-100 bg-indigo-50" : "border-slate-200 bg-slate-50",
        )}
      >
        <div className="mb-1 flex items-center gap-2">
          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
            {message.autor_tipo}
          </Badge>
          <span className="text-[11px] text-slate-500">{formatDateTime(message.created_at)}</span>
        </div>
        {mediaSrc ? (
          <img
            src={mediaSrc}
            alt={message.media?.filename || message.contenido || "Imagen de WhatsApp"}
            className="mb-2 max-h-80 w-full rounded-lg border object-contain"
          />
        ) : null}
        <p className="whitespace-pre-wrap leading-6 text-slate-950">
          {message.contenido || `[${message.tipo_contenido}]`}
        </p>
      </div>
    </div>
  );
}
