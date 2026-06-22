"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Input,
  MultiSelectFilter,
  ScrollArea,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Textarea,
  cn,
} from "@safecampus/ui-kit";
import {
  Activity,
  AlertTriangle,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Lock,
  MessageCircleMore,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Wifi,
  WifiOff,
} from "lucide-react";

import { api } from "@/lib/api/client";
import type {
  ChatbotStatus,
  Conversation,
  ConversationListResponse,
  ConversationMessage,
  ConversationMessagesResponse,
  ConversationPriority,
  ConversationState,
  MessageAuthor,
  RealtimeEvent,
} from "../types";

function buildOmnicanalWsUrl() {
  const configuredWsUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (configuredWsUrl) {
    const base = configuredWsUrl
      .replace(/\/api\/v1\/omnicanal\/ws\/?$/, "")
      .replace(/\/api\/v1\/?$/, "")
      .replace(/\/ws\/?$/, "")
      .replace(/\/$/, "");
    return `${base}/api/v1/omnicanal/ws`;
  }

  const apiBase =
    process.env.NEXT_PUBLIC_API_URL?.replace(/^http/, "ws").replace(/\/api\/v1\/?$/, "") ||
    "ws://localhost:8000";

  return `${apiBase.replace(/\/$/, "")}/api/v1/omnicanal/ws`;
}

const OMNICANAL_WS_URL = buildOmnicanalWsUrl();

const STATE_LABEL: Record<ConversationState, string> = {
  ABIERTA: "Abierta",
  EN_BOT: "Bot activo",
  EN_COLA: "En cola",
  EN_ATENCION: "En atencion",
  CERRADA: "Cerrada",
};

const PRIORITY_RANK: Record<ConversationPriority, number> = {
  CRITICO: 4,
  ALTO: 3,
  MEDIO: 2,
  BAJO: 1,
};

type OperatorOption = {
  id: string;
  nombre_completo: string;
  email: string;
  rol: string;
  online?: boolean;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function minutesSince(value: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
}

function relativeTime(value: string) {
  const minutes = minutesSince(value);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

function normalizePhone(value: string | null | undefined) {
  const raw = value || "";
  const digits = raw.split("@")[0]?.replace(/\D/g, "") || "";
  if (digits.startsWith("51") && digits.length === 11) {
    return `(51) ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  if (digits.length > 6) return `+${digits}`;
  return raw || "Contacto WhatsApp";
}

function contactName(conversation: Conversation) {
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

function modeTone(mode: Conversation["modo_atencion"]) {
  return mode === "BOT"
    ? "border-sky-200 bg-sky-50 text-sky-700"
    : "border-indigo-200 bg-indigo-50 text-indigo-700";
}

function authorLabel(author: MessageAuthor) {
  return {
    CONTACTO: "Contacto",
    BOT: "Bot",
    OPERADOR: "Operador",
    SISTEMA: "Sistema",
  }[author];
}

function getAiClassification(conversation: Conversation) {
  return {
    category:
      conversation.chatbot?.classification_category ||
      conversation.incidente?.titulo ||
      "Incidente por clasificar",
    confidence: conversation.chatbot?.classification_confidence ?? null,
    requiresHumanReview:
      conversation.chatbot?.requires_human_review ??
      (conversation.prioridad !== "BAJO" || !conversation.incidente),
  };
}

type IncidentDraftForm = {
  titulo: string;
  descripcion: string;
  severidad: string;
  categoria: string;
  lugar_referencia: string;
};

function buildDraftForm(conversation: Conversation): IncidentDraftForm {
  const draft = (conversation.chatbot?.incident_draft || {}) as Record<string, unknown>;
  return {
    titulo: typeof draft.titulo === "string" ? draft.titulo : "",
    descripcion: typeof draft.descripcion === "string" ? draft.descripcion : "",
    severidad: typeof draft.severidad === "string" ? draft.severidad : "",
    categoria: typeof draft.categoria === "string" ? draft.categoria : "",
    lugar_referencia:
      typeof draft.lugar_referencia === "string" ? draft.lugar_referencia : "",
  };
}

function chatbotStatusLabel(status: ChatbotStatus) {
  return {
    BOT_NEW: "Bot nuevo",
    BOT_COLLECTING: "Recolectando datos",
    BOT_INCIDENT_DRAFTED: "Incidente borrador",
    BOT_ESCALATED: "Derivado a humano",
    HUMAN_ACTIVE: "Humano activo",
    BOT_PAUSED: "Bot en pausa",
  }[status];
}

function chatbotStatusTone(status: ChatbotStatus) {
  return {
    BOT_NEW: "border-sky-200 bg-sky-50 text-sky-700",
    BOT_COLLECTING: "border-indigo-200 bg-indigo-50 text-indigo-700",
    BOT_INCIDENT_DRAFTED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    BOT_ESCALATED: "border-amber-300 bg-amber-50 text-amber-800",
    HUMAN_ACTIVE: "border-orange-300 bg-orange-50 text-orange-800",
    BOT_PAUSED: "border-slate-300 bg-slate-100 text-slate-700",
  }[status];
}

export function WhatsAppConsole() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stateFilters, setStateFilters] = useState<ConversationState[]>([]);
  const [draft, setDraft] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [operators, setOperators] = useState<OperatorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const counts = useMemo(() => {
    return {
      all: conversations.length,
      active: conversations.filter((item) => item.estado !== "CERRADA").length,
      queue: conversations.filter((item) => item.estado === "EN_COLA").length,
      human: conversations.filter((item) => item.estado === "EN_ATENCION").length,
      bot: conversations.filter((item) => item.estado === "EN_BOT").length,
      closed: conversations.filter((item) => item.estado === "CERRADA").length,
    };
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    const filtered = stateFilters.length
      ? conversations.filter((item) => stateFilters.includes(item.estado))
      : conversations;
    return [...filtered].sort((a, b) => {
      const priority = PRIORITY_RANK[b.prioridad] - PRIORITY_RANK[a.prioridad];
      if (priority !== 0) return priority;
      return new Date(b.ultimo_mensaje_at).getTime() - new Date(a.ultimo_mensaje_at).getTime();
    });
  }, [conversations, stateFilters]);

  const selectedConversation = useMemo(
    () =>
      filteredConversations.find((item) => item.id === selectedId) ??
      filteredConversations[0] ??
      null,
    [filteredConversations, selectedId],
  );

  const queueAverageMinutes = useMemo(() => {
    const queued = conversations.filter((item) => item.estado === "EN_COLA");
    if (!queued.length) return 0;
    return Math.round(
      queued.reduce((sum, item) => sum + minutesSince(item.created_at), 0) / queued.length,
    );
  }, [conversations]);

  const loadConversations = useCallback(async () => {
    const params: Record<string, string> = { limit: "100" };
    if (search.trim()) params.search = search.trim();
    const response = await api.get<ConversationListResponse>(
      "/omnicanal/conversaciones",
      { params },
    );
    setErrorMessage(null);
    setConversations(response.items);
    setSelectedId((current) => {
      if (current && response.items.some((item) => item.id === current)) return current;
      return response.items[0]?.id ?? null;
    });
  }, [search]);

  const loadMessages = useCallback(async (conversationId: string) => {
    const response = await api.get<ConversationMessagesResponse>(
      `/omnicanal/conversaciones/${conversationId}/mensajes`,
      { params: { limit: "300" } },
    );
    setErrorMessage(null);
    setMessages(response.items);
  }, []);

  const refreshSelectedConversation = useCallback(async () => {
    await loadConversations();
    if (selectedIdRef.current) {
      await loadMessages(selectedIdRef.current);
    }
  }, [loadConversations, loadMessages]);

  const loadOperators = useCallback(async () => {
    const response = await api.get<OperatorOption[]>("/incidentes/operadores");
    setOperators(response.map((operator, index) => ({ ...operator, online: index % 3 !== 2 })));
  }, []);

  useEffect(() => {
    selectedIdRef.current = selectedConversation?.id ?? null;
    if (selectedConversation?.operador_asignado?.id) {
      setOperatorId(selectedConversation.operador_asignado.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    setLoading(true);
    loadConversations()
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar la bandeja.");
      })
      .finally(() => setLoading(false));
  }, [loadConversations]);

  useEffect(() => {
    loadOperators().catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar operadores.");
    });
  }, [loadOperators]);

  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }
    loadMessages(selectedConversation.id).catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar mensajes.");
    });
  }, [loadMessages, selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;

    const connect = () => {
      socket = new WebSocket(OMNICANAL_WS_URL);
      socket.onopen = () => setWsConnected(true);
      socket.onclose = () => {
        setWsConnected(false);
        if (!disposed) reconnectTimer = window.setTimeout(connect, 2500);
      };
      socket.onmessage = (event) => {
        let data: RealtimeEvent;
        try {
          data = JSON.parse(event.data) as RealtimeEvent;
        } catch {
          return;
        }
        loadConversations().catch((error) => {
          setErrorMessage(
            error instanceof Error ? error.message : "No se pudo refrescar la bandeja.",
          );
        });
        if (data.conversacion_id && data.conversacion_id === selectedIdRef.current) {
          loadMessages(data.conversacion_id).catch((error) => {
            setErrorMessage(
              error instanceof Error ? error.message : "No se pudo refrescar mensajes.",
            );
          });
        }
      };
    };

    connect();
    return () => {
      disposed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [loadConversations, loadMessages]);

  async function runConversationAction(action: () => Promise<unknown>) {
    try {
      await action();
      await loadConversations();
      if (selectedConversation) await loadMessages(selectedConversation.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo ejecutar la accion.");
    }
  }

  async function handleSend() {
    if (!selectedConversation || !draft.trim() || sending) return;
    const content = draft.trim();
    setSending(true);
    try {
      await api.post(
        `/omnicanal/conversaciones/${selectedConversation.id}/mensajes`,
        { contenido: content },
      );
      setDraft("");
      await loadConversations();
      await loadMessages(selectedConversation.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo enviar el mensaje.");
    } finally {
      setSending(false);
    }
  }

  async function closeConversation() {
    if (!selectedConversation) return;
    const confirmed = window.confirm("¿Cerrar esta conversación? Podrás reabrirla si es necesario.");
    if (!confirmed) return;
    await runConversationAction(() =>
      api.post(`/omnicanal/conversaciones/${selectedConversation.id}/cerrar`, {
        motivo: "Cierre operativo desde bandeja.",
      }),
    );
  }

  const selectedAi = selectedConversation ? getAiClassification(selectedConversation) : null;

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-180 flex-col bg-slate-50 p-6">
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Bandeja operativa WhatsApp</h1>
            <p className="mt-1 text-sm text-slate-500">
              {counts.all} {counts.all === 1 ? "conversación registrada" : "conversaciones registradas"}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <RealtimeBadge connected={wsConnected} />
            <KpiCard label="Activas" value={counts.active} tone="emerald" icon={Activity} />
            <KpiCard label="Cola" value={counts.queue} tone="amber" icon={Clock3} />
            <KpiCard label="Humano" value={counts.human} tone="indigo" icon={UserCheck} />
            <KpiCard label="Bot" value={counts.bot} tone="sky" icon={Bot} />
            <KpiCard label="Prom. espera" value={`${queueAverageMinutes}m`} tone="slate" icon={AlertTriangle} />
          </div>
        </div>
        {errorMessage ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {errorMessage}
          </div>
        ) : null}
      </header>

      <main className="mt-5 grid min-h-0 flex-1 grid-cols-[390px_minmax(0,1fr)_360px] overflow-hidden rounded-xl border bg-white">
        <aside className="flex min-h-0 flex-col border-r bg-white">
          <div className="space-y-3 border-b p-4">
            <SearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar contacto o mensaje"
              className="border-0 bg-slate-100"
            />
            <ConversationFilter value={stateFilters} onChange={setStateFilters} counts={counts} />
          </div>

          <ConversationList
            loading={loading}
            conversations={filteredConversations}
            selectedId={selectedConversation?.id ?? null}
            onSelect={setSelectedId}
          />
        </aside>

        <section className="flex min-h-0 flex-col bg-slate-50">
          {selectedConversation ? (
            <>
              <ChatHeader
                conversation={selectedConversation}
                onRefresh={() =>
                  loadMessages(selectedConversation.id).catch((error) => {
                    setErrorMessage(
                      error instanceof Error ? error.message : "No se pudo actualizar mensajes.",
                    );
                  })
                }
              />

              <ScrollArea className="min-h-0 flex-1 p-5">
                <div className="mx-auto flex max-w-4xl flex-col gap-3">
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="border-t bg-white p-4">
                {selectedConversation.estado === "CERRADA" ? (
                  <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-100 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Lock className="h-4 w-4 text-slate-500" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Conversacion cerrada</p>
                        <p className="text-xs text-slate-500">Reabre el chat para responder desde SafeCampus.</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        void runConversationAction(() =>
                          api.post(`/omnicanal/conversaciones/${selectedConversation.id}/reabrir`),
                        )
                      }
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reabrir chat
                    </Button>
                  </div>
                ) : (
                  <div className="mx-auto flex max-w-4xl items-end gap-3">
                    <Textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Escribe una respuesta operativa..."
                      className="min-h-12 resize-none rounded-xl border-0 bg-slate-100"
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void handleSend();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      disabled={!draft.trim() || sending}
                      onClick={() => void handleSend()}
                      className="h-12 bg-[#001C55] px-5"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Enviar
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-slate-500">
              No hay conversaciones para mostrar.
            </div>
          )}
        </section>

        <aside className="min-h-0 border-l bg-white">
          {selectedConversation ? (
            <ScrollArea className="h-full">
              <div className="space-y-5 p-4">
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-slate-900">Operacion</h2>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={cn("border", stateTone(selectedConversation.estado))}>
                      {STATE_LABEL[selectedConversation.estado]}
                    </Badge>
                    <Badge className={cn("border", modeTone(selectedConversation.modo_atencion))}>
                      {selectedConversation.modo_atencion === "BOT" ? (
                        <Bot className="mr-1 h-3 w-3" />
                      ) : (
                        <ShieldCheck className="mr-1 h-3 w-3" />
                      )}
                      {selectedConversation.modo_atencion}
                    </Badge>
                    {selectedConversation.chatbot ? (
                      <Badge
                        className={cn(
                          "border",
                          chatbotStatusTone(selectedConversation.chatbot.bot_status),
                        )}
                      >
                        <Bot className="mr-1 h-3 w-3" />
                        {chatbotStatusLabel(selectedConversation.chatbot.bot_status)}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Button
                    type="button"
                    className="bg-[#001C55]"
                    onClick={() =>
                      void runConversationAction(() =>
                        api.post(`/omnicanal/conversaciones/${selectedConversation.id}/tomar`),
                      )
                    }
                    disabled={selectedConversation.estado === "CERRADA"}
                  >
                    <UserCheck className="mr-2 h-4 w-4" />
                    Tomar chat
                  </Button>
                  <div className="grid gap-2 rounded-lg border bg-slate-50 p-3">
                    <Select value={operatorId} onValueChange={setOperatorId}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Asignar operador" />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map((operator) => (
                          <SelectItem key={operator.id} value={operator.id}>
                            <span className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "h-2 w-2 rounded-full",
                                  operator.online ? "bg-emerald-500" : "bg-slate-300",
                                )}
                              />
                              {operator.nombre_completo}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!operatorId || selectedConversation.estado === "CERRADA"}
                      onClick={() =>
                        void runConversationAction(() =>
                          api.post(
                            `/omnicanal/conversaciones/${selectedConversation.id}/asignar`,
                            { operador_id: operatorId },
                          ),
                        )
                      }
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Asignar
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      selectedConversation.estado === "CERRADA" ||
                      selectedConversation.modo_atencion === "BOT"
                    }
                    onClick={() =>
                      void runConversationAction(() =>
                        api.post(`/omnicanal/conversaciones/${selectedConversation.id}/modo-bot`),
                      )
                    }
                  >
                    <Bot className="mr-2 h-4 w-4" />
                    Activar bot
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      selectedConversation.estado === "CERRADA" ||
                      selectedConversation.modo_atencion === "HUMANO"
                    }
                    onClick={() =>
                      void runConversationAction(() =>
                        api.post(`/omnicanal/conversaciones/${selectedConversation.id}/modo-humano`),
                      )
                    }
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Pasar a humano
                  </Button>
                </div>

                <Separator />

                <AiClassificationPanel conversation={selectedConversation} classification={selectedAi} />

                <ChatbotPanel
                  conversation={selectedConversation}
                  onUpdated={() => void refreshSelectedConversation()}
                />

                <InfoBlock label="Ultima actividad" value={formatDateTime(selectedConversation.ultimo_mensaje_at)} />
                <InfoBlock label="Tiempo en cola" value={relativeTime(selectedConversation.created_at)} />

                <div className="rounded-lg border bg-slate-50 p-4">
                  <div className="flex items-center gap-2 font-medium text-slate-900">
                    <MessageCircleMore className="h-4 w-4 text-[#001C55]" />
                    Incidente vinculado
                  </div>
                  {selectedConversation.incidente ? (
                    <div className="mt-3 space-y-2 text-sm">
                      <p className="font-semibold">{selectedConversation.incidente.codigo}</p>
                      <p className="text-slate-700">{selectedConversation.incidente.titulo}</p>
                      <Badge variant="outline">{selectedConversation.incidente.estado}</Badge>
                      <Button asChild variant="outline" size="sm" className="mt-1">
                        <Link href={`/incidentes/${selectedConversation.incidente.id}`}>
                          Revisar incidente
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">
                      Todavia no se creo ni vinculo un incidente.
                    </p>
                  )}
                </div>

                <Separator />

                {selectedConversation.estado === "CERRADA" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      void runConversationAction(() =>
                        api.post(`/omnicanal/conversaciones/${selectedConversation.id}/reabrir`),
                      )
                    }
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reabrir chat
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full"
                    onClick={() => void closeConversation()}
                  >
                    Cerrar chat
                  </Button>
                )}
              </div>
            </ScrollArea>
          ) : null}
        </aside>
      </main>
    </div>
  );
}

function ConversationFilter({
  value,
  onChange,
  counts,
}: {
  value: ConversationState[];
  onChange: (value: ConversationState[]) => void;
  counts: { all: number; queue: number; human: number; bot: number; closed: number };
}) {
  const options: Array<{ value: ConversationState; label: string }> = [
    { value: "EN_COLA", label: `En cola (${counts.queue})` },
    { value: "EN_ATENCION", label: `En atención (${counts.human})` },
    { value: "EN_BOT", label: `Bot (${counts.bot})` },
    { value: "CERRADA", label: `Cerradas (${counts.closed})` },
  ];

  return (
    <MultiSelectFilter
      placeholder={`Todas las conversaciones (${counts.all})`}
      options={options}
      selected={value}
      onChange={onChange}
    />
  );
}

function ConversationList({
  loading,
  conversations,
  selectedId,
  onSelect,
}: {
  loading: boolean;
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="space-y-2 p-3">
        {loading ? (
          <p className="p-4 text-sm text-slate-500">Cargando conversaciones...</p>
        ) : null}
        {conversations.map((conversation) => (
          <ConversationCard
            key={conversation.id}
            conversation={conversation}
            active={conversation.id === selectedId}
            onClick={() => onSelect(conversation.id)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

function ConversationCard({
  conversation,
  active,
  onClick,
}: {
  conversation: Conversation;
  active: boolean;
  onClick: () => void;
}) {
  const name = contactName(conversation);
  const needsReview = getAiClassification(conversation).requiresHumanReview;
  const chatbotState = conversation.chatbot;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border p-3 text-left transition",
        active
          ? "border-[#001C55] bg-[#001C55]/5 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-11 w-11">
          <AvatarFallback className="bg-[#001C55]/10 text-[#001C55]">
            {initials(name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-950">{name}</p>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                <MessageCircleMore className="h-3.5 w-3.5 text-emerald-600" />
                <span className="truncate">{normalizePhone(conversation.telefono_contacto || conversation.external_chat_id)}</span>
              </div>
            </div>
            <span className="shrink-0 text-xs text-slate-500">{relativeTime(conversation.ultimo_mensaje_at)}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-slate-700">
            {conversation.ultimo_mensaje_preview || "Sin mensajes registrados"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Badge className={cn("border font-semibold", priorityTone(conversation.prioridad))}>
              {conversation.prioridad}
            </Badge>
            <Badge className={cn("border", stateTone(conversation.estado))}>
              {STATE_LABEL[conversation.estado]}
            </Badge>
            {chatbotState ? (
              <Badge className={cn("border", chatbotStatusTone(chatbotState.bot_status))}>
                <Bot className="mr-1 h-3 w-3" />
                {chatbotStatusLabel(chatbotState.bot_status)}
              </Badge>
            ) : null}
            {needsReview ? (
              <Badge className="border border-violet-200 bg-violet-50 text-violet-700">
                <BrainCircuit className="mr-1 h-3 w-3" />
                IA pendiente
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}

function ChatHeader({
  conversation,
  onRefresh,
}: {
  conversation: Conversation;
  onRefresh: () => void;
}) {
  return (
    <div className="border-b bg-white px-5 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-[#001C55]/10 text-[#001C55]">
              {initials(contactName(conversation))}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-slate-950">{contactName(conversation)}</h2>
            <p className="text-xs text-slate-500">{normalizePhone(conversation.telefono_contacto || conversation.external_chat_id)}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge className={cn("border", stateTone(conversation.estado))}>
                {STATE_LABEL[conversation.estado]}
              </Badge>
              <Badge className={cn("border", modeTone(conversation.modo_atencion))}>
                {conversation.modo_atencion}
              </Badge>
              <Badge className={cn("border font-semibold", priorityTone(conversation.prioridad))}>
                {conversation.prioridad}
              </Badge>
              <Badge variant="outline">En sistema {relativeTime(conversation.created_at)}</Badge>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ConversationMessage }) {
  const outgoing = message.direccion === "OUTBOUND";
  const isBot = message.autor_tipo === "BOT";
  const isOperator = message.autor_tipo === "OPERADOR";

  return (
    <div className={cn("flex", outgoing ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[72%] rounded-xl border px-3 py-2 text-sm shadow-sm",
          outgoing && isOperator
            ? "border-indigo-100 bg-indigo-50 text-slate-950"
            : outgoing && isBot
              ? "border-sky-100 bg-sky-50 text-slate-950"
              : "border-slate-200 bg-white text-slate-950",
        )}
      >
        <div className="mb-1 flex items-center gap-1.5">
          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
            {authorLabel(message.autor_tipo)}
          </Badge>
        </div>
        <p className="whitespace-pre-wrap leading-6">
          {message.contenido || `[${message.tipo_contenido}]`}
        </p>
        <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-slate-500">
          <span>{formatTime(message.created_at)}</span>
          {outgoing ? <CheckCircle2 className="h-3 w-3" /> : null}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  tone: "emerald" | "amber" | "indigo" | "sky" | "slate";
  icon: typeof Activity;
}) {
  const hasValue = typeof value === "number" ? value > 0 : value !== "0m";
  const tones = {
    emerald: hasValue ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-400",
    amber: hasValue ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-white text-slate-400",
    indigo: hasValue ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-400",
    sky: hasValue ? "border-sky-200 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-400",
    slate: hasValue ? "border-slate-300 bg-slate-100 text-slate-700" : "border-slate-200 bg-white text-slate-400",
  };

  return (
    <div className={cn("min-w-28 rounded-xl border px-3 py-2", tones[tone])}>
      <div className="flex items-center justify-between gap-2">
        <Icon className="h-4 w-4" />
        <p className="text-lg font-bold">{value}</p>
      </div>
      <p className="mt-1 text-xs font-medium">{label}</p>
    </div>
  );
}

function RealtimeBadge({ connected }: { connected: boolean }) {
  return (
    <Badge
      className={cn(
        "h-9 gap-2 rounded-full border px-3",
        connected
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          connected ? "animate-pulse bg-emerald-500" : "bg-red-500",
        )}
      />
      {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
      {connected ? "Realtime conectado" : "Desconectado"}
    </Badge>
  );
}

function AiClassificationPanel({
  conversation,
  classification,
}: {
  conversation: Conversation;
  classification: ReturnType<typeof getAiClassification> | null;
}) {
  if (!classification) return null;

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center gap-2 font-semibold text-slate-900">
        <BrainCircuit className="h-4 w-4 text-violet-700" />
        Clasificacion IA
      </div>
      <div className="mt-3 grid gap-3 text-sm">
        <InfoRow label="Categoría sugerida" value={classification.category} />
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-500">Severidad</span>
          <Badge className={cn("border font-semibold", priorityTone(conversation.prioridad))}>
            {conversation.prioridad}
          </Badge>
        </div>
        <InfoRow
          label="Confidence score"
          value={classification.confidence === null ? "Pendiente" : `${classification.confidence}%`}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-500">Revision humana</span>
          <Badge
            className={
              classification.requiresHumanReview
                ? "border border-amber-200 bg-amber-50 text-amber-700"
                : "border border-emerald-200 bg-emerald-50 text-emerald-700"
            }
          >
            {classification.requiresHumanReview ? "Requerida" : "No requerida"}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function ChatbotPanel({
  conversation,
  onUpdated,
}: {
  conversation: Conversation;
  onUpdated: () => void;
}) {
  const chatbot = conversation.chatbot;
  const [aiSummary, setAiSummary] = useState(chatbot?.ai_summary || "");
  const [draftForm, setDraftForm] = useState<IncidentDraftForm>(() => buildDraftForm(conversation));
  const [saving, setSaving] = useState(false);
  const [creatingIncident, setCreatingIncident] = useState(false);

  useEffect(() => {
    setAiSummary(conversation.chatbot?.ai_summary || "");
    setDraftForm(buildDraftForm(conversation));
  }, [conversation]);

  if (!chatbot) return null;

  async function saveDraft() {
    setSaving(true);
    try {
      await api.patch(`/omnicanal/conversaciones/${conversation.id}/chatbot-borrador`, {
        ai_summary: aiSummary,
        titulo: draftForm.titulo,
        descripcion: draftForm.descripcion,
        severidad: draftForm.severidad || null,
        categoria: draftForm.categoria,
        lugar_referencia: draftForm.lugar_referencia,
      });
      onUpdated();
    } finally {
      setSaving(false);
    }
  }

  async function createIncidentFromDraft() {
    setCreatingIncident(true);
    try {
      await api.post(`/omnicanal/conversaciones/${conversation.id}/crear-incidente`, {
        titulo: draftForm.titulo || null,
        descripcion: draftForm.descripcion || null,
        severidad: draftForm.severidad || null,
        categoria: draftForm.categoria || null,
        lugar_referencia: draftForm.lugar_referencia || null,
      });
      onUpdated();
    } finally {
      setCreatingIncident(false);
    }
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center gap-2 font-semibold text-slate-900">
        <Bot className="h-4 w-4 text-[#001C55]" />
        Estado del chatbot
      </div>
      <div className="mt-3 space-y-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-500">Estado</span>
          <Badge className={cn("border", chatbotStatusTone(chatbot.bot_status))}>
            {chatbotStatusLabel(chatbot.bot_status)}
          </Badge>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase text-slate-500">Resumen editable</p>
          <Textarea
            value={aiSummary}
            onChange={(event) => setAiSummary(event.target.value)}
            className="min-h-20 resize-y bg-slate-50"
            placeholder="Resumen operativo editable para supervisor"
          />
        </div>
        {chatbot.handoff_reason ? (
          <InfoRow label="Derivacion" value={chatbot.handoff_reason} />
        ) : null}
        {chatbot.missing_fields.length ? (
          <InfoRow label="Datos faltantes" value={chatbot.missing_fields.join(", ")} />
        ) : null}
        {chatbot.suggested_reply ? (
          <InfoRow label="Ultima respuesta bot" value={chatbot.suggested_reply} />
        ) : null}
        <div className="rounded-lg border bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase text-slate-500">Borrador de incidente</p>
          <div className="mt-2 space-y-2">
            <Input
              value={draftForm.titulo}
              onChange={(event) => setDraftForm((prev) => ({ ...prev, titulo: event.target.value }))}
              placeholder="Titulo del incidente"
              className="bg-white"
            />
            <Textarea
              value={draftForm.descripcion}
              onChange={(event) =>
                setDraftForm((prev) => ({ ...prev, descripcion: event.target.value }))
              }
              className="min-h-20 resize-y bg-white"
              placeholder="Descripcion del incidente"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={draftForm.categoria}
                onChange={(event) =>
                  setDraftForm((prev) => ({ ...prev, categoria: event.target.value }))
                }
                placeholder="Categoría"
                className="bg-white"
              />
              <Select
                value={draftForm.severidad || "NONE"}
                onValueChange={(value) =>
                  setDraftForm((prev) => ({ ...prev, severidad: value === "NONE" ? "" : value }))
                }
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Severidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Sin severidad</SelectItem>
                  <SelectItem value="BAJO">BAJO</SelectItem>
                  <SelectItem value="MEDIO">MEDIO</SelectItem>
                  <SelectItem value="ALTO">ALTO</SelectItem>
                  <SelectItem value="CRITICO">CRITICO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              value={draftForm.lugar_referencia}
              onChange={(event) =>
                setDraftForm((prev) => ({ ...prev, lugar_referencia: event.target.value }))
              }
              placeholder="Ubicación o referencia"
              className="bg-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" disabled={saving} onClick={() => void saveDraft()}>
                {saving ? "Guardando..." : "Guardar borrador"}
              </Button>
              <Button
                type="button"
                className="bg-[#001C55]"
                disabled={creatingIncident || Boolean(conversation.incidente)}
                onClick={() => void createIncidentFromDraft()}
              >
                {conversation.incidente
                  ? "Incidente ya vinculado"
                  : creatingIncident
                    ? "Registrando..."
                    : "Registrar incidente"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}
