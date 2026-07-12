"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Input,
  ScrollArea,
  SearchInput,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from "@safecampus/ui-kit";
import {
  ExternalLink,
  History,
} from "lucide-react";

import { api } from "@/lib/api/client";
import { formatLimaDateTime } from "@/lib/lima-date";
import { CycleDetailDialog, CycleList } from "./whatsapp-cycles";
import type {
  Conversation,
  ConversationCycleDetail,
  ConversationCyclesDetail,
  ConversationHistoryDetail,
  ConversationHistoryListItem,
  ConversationHistoryListResponse,
  ConversationIncidentHistoryItem,
  ConversationPriority,
  ConversationState,
} from "../types";

const STATE_LABEL: Record<ConversationState, string> = {
  ABIERTA: "Abierta",
  EN_BOT: "Bot activo",
  EN_COLA: "En cola",
  EN_ATENCION: "En atencion",
  CERRADA: "Cerrada",
};

function normalizePhone(value: string | null | undefined) {
  const raw = value || "";
  const digits = raw.split("@")[0]?.replace(/\D/g, "") || "";
  if (digits.startsWith("51") && digits.length === 11) {
    return `(51) ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  if (digits.length > 6) return `+${digits}`;
  return raw || "Contacto WhatsApp";
}

function contactName(conversation: Pick<Conversation, "nombre_contacto" | "telefono_contacto" | "external_chat_id">) {
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

function formatDateTime(value: string) {
  return formatLimaDateTime(value, {
    dateStyle: "medium",
    timeStyle: "short",
  }, value);
}

function stateTone(state: ConversationState) {
  return {
    ABIERTA: "border-slate-200 bg-slate-50 text-slate-700",
    EN_BOT: "border-sky-200 bg-sky-50 text-sky-700",
    EN_COLA: "border-amber-300 bg-amber-50 text-amber-800",
    EN_ATENCION: "border-emerald-300 bg-emerald-50 text-emerald-800",
    CERRADA: "border-slate-300 bg-slate-100 text-slate-700",
  }[state];
}

function priorityTone(priority: ConversationPriority) {
  return {
    BAJO: "border-slate-300 bg-slate-100 text-slate-700",
    MEDIO: "border-yellow-400 bg-yellow-100 text-yellow-900",
    ALTO: "border-orange-400 bg-orange-100 text-orange-900",
    CRITICO: "border-red-500 bg-red-100 text-red-900",
  }[priority];
}

function isConversationPriority(value: string | null | undefined): value is ConversationPriority {
  return value === "BAJO" || value === "MEDIO" || value === "ALTO" || value === "CRITICO";
}

function associationLabel(value: string) {
  return {
    AUTOMATICA_BOT: "Registro automatico del bot",
    CREACION_MANUAL: "Creacion manual",
    VINCULO_MANUAL: "Vinculo manual",
    LEGACY_ACTIVA: "Asociacion migrada",
  }[value] ?? value.replaceAll("_", " ");
}

function closureReasonLabel(value: string | null | undefined) {
  if (!value) return "Sin motivo";
  const labels: Record<string, string> = {
    CONVERSACION_CERRADA: "Conversacion cerrada",
    REEMPLAZADO: "Reemplazado por otro incidente",
    MANUAL: "Cierre manual",
    INACTIVIDAD: "Cierre por inactividad",
    REABIERTO: "Ciclo reabierto",
  };
  return labels[value] ?? value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

function closureReasonTone(value: string | null | undefined) {
  const tones: Record<string, string> = {
    CONVERSACION_CERRADA: "border-slate-300 bg-slate-100 text-slate-700",
    REEMPLAZADO: "border-amber-300 bg-amber-50 text-amber-800",
    MANUAL: "border-indigo-200 bg-indigo-50 text-indigo-700",
    INACTIVIDAD: "border-orange-300 bg-orange-50 text-orange-800",
    REABIERTO: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
  return tones[value ?? ""] ?? "border-slate-200 bg-slate-50 text-slate-700";
}

function WhatsAppIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <img
      src="/icon-whatsapp.svg"
      alt=""
      aria-hidden="true"
      className={className}
    />
  );
}

export function WhatsAppHistory() {
  const searchParams = useSearchParams();
  const requestedConversationId = searchParams.get("conversacion");
  const [items, setItems] = useState<ConversationHistoryListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(requestedConversationId);
  const [detail, setDetail] = useState<ConversationHistoryDetail | null>(null);
  const [search, setSearch] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingCycles, setLoadingCycles] = useState(false);
  const [activeTab, setActiveTab] = useState<"incidentes" | "ciclos">("incidentes");
  const [cyclesDetail, setCyclesDetail] = useState<ConversationCyclesDetail | null>(null);
  const [cycleDetail, setCycleDetail] = useState<ConversationCycleDetail | null>(null);
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
    const response = await api.get<ConversationHistoryListResponse>(
      "/omnicanal/historial/conversaciones",
      { params },
    );
    setItems(response.items);
    setErrorMessage(null);
    setSelectedId((current) => {
      if (current && response.items.some((item) => item.id === current)) return current;
      if (requestedConversationId && response.items.some((item) => item.id === requestedConversationId)) {
        return requestedConversationId;
      }
      return response.items[0]?.id ?? null;
    });
  }, [desde, hasta, requestedConversationId, search]);

  const loadDetail = useCallback(async (conversationId: string) => {
    setLoadingDetail(true);
    try {
      const response = await api.get<ConversationHistoryDetail>(
        `/omnicanal/historial/conversaciones/${conversationId}`,
      );
      setDetail(response);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar el historial.");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const loadCycles = useCallback(async (conversationId: string) => {
    setLoadingCycles(true);
    try {
      const response = await api.get<ConversationCyclesDetail>(
        `/omnicanal/ciclos/conversaciones/${conversationId}`,
      );
      setCyclesDetail(response);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar ciclos.");
    } finally {
      setLoadingCycles(false);
    }
  }, []);

  async function openCycle(cycleId: string) {
    const response = await api.get<ConversationCycleDetail>(`/omnicanal/ciclos/${cycleId}`);
    setCycleDetail(response);
  }

  async function reopenCycle(cycleId: string) {
    await api.post(`/omnicanal/ciclos/${cycleId}/reabrir`);
    setCycleDetail(null);
    if (selectedId) {
      await loadCycles(selectedId);
      await loadDetail(selectedId);
    }
  }

  useEffect(() => {
    setLoadingList(true);
    loadItems()
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar el historial.");
      })
      .finally(() => setLoadingList(false));
  }, [loadItems]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setCyclesDetail(null);
      setCycleDetail(null);
      return;
    }
    setCyclesDetail(null);
    setCycleDetail(null);
    void loadDetail(selectedId);
  }, [loadDetail, selectedId]);

  useEffect(() => {
    if (activeTab !== "ciclos" || !selectedId) return;
    if (cyclesDetail?.conversacion.id === selectedId) return;
    void loadCycles(selectedId);
  }, [activeTab, cyclesDetail?.conversacion.id, loadCycles, selectedId]);

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-180 flex-col bg-slate-50 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Historial de conversaciones</h1>
        </div>
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
              {loadingList ? (
                <p className="p-4 text-sm text-slate-500">Cargando historial...</p>
              ) : null}
              {items.map((item) => (
                <HistoryConversationCard
                  key={item.id}
                  item={item}
                  active={item.id === selectedId}
                  onClick={() => setSelectedId(item.id)}
                />
              ))}
              {!loadingList && items.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
                  No hay conversaciones historicas con esos filtros.
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </aside>

        <section className="min-h-0 bg-slate-50">
          <ScrollArea className="h-full">
            <div className="mx-auto max-w-5xl space-y-5 p-6">
              {detail ? (
                <>
                  <ConversationSummary conversation={detail.conversacion} fallback={selectedItem} />
                  <Tabs
                    value={activeTab}
                    onValueChange={(value) => setActiveTab(value as "incidentes" | "ciclos")}
                    className="space-y-4"
                  >
                    <TabsList className="grid h-10 w-full max-w-sm grid-cols-2 rounded-lg">
                      <TabsTrigger value="incidentes">Incidentes</TabsTrigger>
                      <TabsTrigger value="ciclos">Ciclos</TabsTrigger>
                    </TabsList>
                    <TabsContent
                      value="incidentes"
                      className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:duration-200"
                    >
                      <IncidentTimeline items={detail.incidentes} loading={loadingDetail} />
                    </TabsContent>
                    <TabsContent
                      value="ciclos"
                      className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:duration-200"
                    >
                      <CycleList
                        items={cyclesDetail?.ciclos ?? []}
                        loading={loadingCycles}
                        onOpen={(cycleId) => void openCycle(cycleId)}
                      />
                    </TabsContent>
                  </Tabs>
                </>
              ) : (
                <div className="flex min-h-96 items-center justify-center rounded-lg border border-dashed bg-white text-sm text-slate-500">
                  Selecciona una conversacion para ver su historial.
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

function HistoryConversationCard({
  item,
  active,
  onClick,
}: {
  item: ConversationHistoryListItem;
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
          <AvatarFallback className="bg-[#001C55]/10 text-[#001C55]">
            {initials(name)}
          </AvatarFallback>
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
            <Badge variant="outline">{item.incidentes_count}</Badge>
          </div>
        </div>
      </div>
    </button>
  );
}

function ConversationSummary({
  conversation,
  fallback,
}: {
  conversation: Conversation;
  fallback: ConversationHistoryListItem | null;
}) {
  const incidentCount = conversation.historico_incidentes_count || fallback?.incidentes_count || 0;

  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-slate-500">Conversacion</p>
          <h2 className="mt-1 truncate text-xl font-bold text-slate-950">{contactName(conversation)}</h2>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <WhatsAppIcon className="h-4 w-4" />
            <span>{normalizePhone(conversation.telefono_contacto || conversation.external_chat_id)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={cn("border", stateTone(conversation.estado))}>
            {STATE_LABEL[conversation.estado]}
          </Badge>
          <Badge variant="outline">
            <History className="mr-1 h-3.5 w-3.5" />
            {incidentCount} incidentes
          </Badge>
        </div>
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <InfoBlock label="Ultima actividad" value={formatDateTime(conversation.ultimo_mensaje_at)} />
        <InfoBlock label="Creada" value={formatDateTime(conversation.created_at)} />
        <InfoBlock label="Chat externo" value={conversation.external_chat_id} />
      </div>
    </div>
  );
}

function IncidentTimeline({
  items,
  loading,
}: {
  items: ConversationIncidentHistoryItem[];
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-[#001C55]" />
        <h3 className="font-semibold text-slate-950">Linea de tiempo de incidentes</h3>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Actualizando detalle...</p>
      ) : null}

      <div className="mt-5 space-y-5">
        {items.map((item) => (
          <TimelineItem key={item.id} item={item} />
        ))}
        {!loading && items.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
            Esta conversacion aun no tiene incidentes historicos.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TimelineItem({ item }: { item: ConversationIncidentHistoryItem }) {
  return (
    <div className="grid grid-cols-[18px_minmax(0,1fr)] gap-3">
      <div className="flex flex-col items-center">
        <span className="mt-1 h-3 w-3 rounded-full bg-[#001C55]" />
        <span className="mt-2 h-full min-h-16 w-px bg-slate-200" />
      </div>
      <div className="rounded-lg border bg-slate-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-slate-500">
              {associationLabel(item.tipo_asociacion)}
            </p>
            <h4 className="mt-1 font-semibold text-slate-950">
              {item.incidente ? `${item.incidente.codigo} - ${item.incidente.titulo}` : "Incidente sin referencia"}
            </h4>
          </div>
          {item.incidente ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/incidentes/${item.incidente.id}`}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Ir a incidente
              </Link>
            </Button>
          ) : null}
        </div>
        <IncidentMetadata item={item} />
      </div>
    </div>
  );
}

function IncidentMetadata({ item }: { item: ConversationIncidentHistoryItem }) {
  const severity = item.incidente?.severidad;

  return (
    <div className="mt-4 rounded-lg border bg-white p-3 text-sm">
      <div className="grid gap-x-5 gap-y-3 sm:grid-cols-[120px_minmax(0,1fr)]">
        <p className="text-xs font-medium uppercase text-slate-500">Severidad</p>
        <div>
          {isConversationPriority(severity) ? (
            <Badge className={cn("border font-semibold", priorityTone(severity))}>
              {severity}
            </Badge>
          ) : (
            <span className="font-medium text-slate-900">{severity || "Sin severidad"}</span>
          )}
        </div>

        <p className="text-xs font-medium uppercase text-slate-500">Asociado</p>
        <p className="font-medium text-slate-900">{formatDateTime(item.asociado_at)}</p>

        <p className="text-xs font-medium uppercase text-slate-500">Finalizado</p>
        <p className="font-medium text-slate-900">
          {item.finalizado_at ? formatDateTime(item.finalizado_at) : "Activo"}
        </p>

        <p className="text-xs font-medium uppercase text-slate-500">Actor</p>
        <p className="font-medium text-slate-900">
          {item.actor_usuario?.nombre_completo || item.actor_tipo}
        </p>

        <p className="text-xs font-medium uppercase text-slate-500">Motivo</p>
        <div>
          <Badge className={cn("border font-semibold", closureReasonTone(item.motivo_finalizacion))}>
            {closureReasonLabel(item.motivo_finalizacion)}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border bg-white px-3 py-2">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
