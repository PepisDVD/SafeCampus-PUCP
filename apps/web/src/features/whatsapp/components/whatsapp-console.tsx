"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Input,
  MultiSelectFilter,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  cn,
  toast,
} from "@safecampus/ui-kit";
import {
  Bot,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  ExternalLink,
  Filter,
  History,
  ImagePlus,
  Lock,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  UserRound,
  UserCheck,
  UserPlus,
  Wifi,
  WifiOff,
  X,
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

async function buildAuthenticatedOmnicanalWsUrl() {
  const response = await fetch("/api/backend/auth/web/ws-token", {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) return OMNICANAL_WS_URL;
  const payload = (await response.json().catch(() => null)) as {
    access_token?: string;
  } | null;
  if (!payload?.access_token) return OMNICANAL_WS_URL;
  const url = new URL(OMNICANAL_WS_URL);
  url.searchParams.set("token", payload.access_token);
  return url.toString();
}

// Los errores de red nativos de fetch llegan como "Failed to fetch" (o un
// TypeError), un mensaje técnico que no aporta nada al operador. Los traducimos
// a un texto amigable y dejamos pasar los mensajes de negocio del backend.
function isNetworkError(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    (error instanceof Error && /failed to fetch|networkerror|load failed/i.test(error.message))
  );
}

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (isNetworkError(error)) {
    return "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.";
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

const STATE_LABEL: Record<ConversationState, string> = {
  ABIERTA: "Abierta",
  EN_BOT: "Bot activo",
  EN_COLA: "En cola",
  EN_ATENCION: "En atención",
  CERRADA: "Cerrada",
};

const PRIORITY_LABEL: Record<ConversationPriority, string> = {
  BAJO: "Baja",
  MEDIO: "Media",
  ALTO: "Alta",
  CRITICO: "Crítica",
};

const MODE_LABEL: Record<NonNullable<Conversation["modo_atencion"]>, string> = {
  BOT: "Bot",
  HUMANO: "Humano",
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

function WhatsAppIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    // SVG decorativo estático; next/image no aporta optimización para un ícono inline.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icon-whatsapp.svg"
      alt=""
      aria-hidden="true"
      className={className}
    />
  );
}

function getAiClassification(conversation: Conversation) {
  if (conversation.estado === "CERRADA") return null;

  return {
    category:
      conversation.chatbot?.classification_category ||
      conversation.incidente?.titulo ||
      "Incidente por clasificar",
    confidence: conversation.chatbot?.classification_confidence ?? null,
    requiresHumanReview:
      conversation.chatbot?.requires_human_review ??
      ((conversation.prioridad !== null && conversation.prioridad !== "BAJO") ||
        !conversation.incidente),
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

function ConversationStateBadge({ state }: { state: ConversationState }) {
  return (
    <Badge className={cn("border", stateTone(state))}>
      {STATE_LABEL[state]}
    </Badge>
  );
}

function ConversationPriorityBadge({ priority }: { priority: ConversationPriority }) {
  return (
    <Badge className={cn("border font-semibold", priorityTone(priority))}>
      {PRIORITY_LABEL[priority]}
    </Badge>
  );
}

function ConversationModeBadge({ mode }: { mode: NonNullable<Conversation["modo_atencion"]> }) {
  return (
    <Badge className={cn("border", modeTone(mode))}>
      {mode === "BOT" ? <Bot className="mr-1 h-3 w-3" /> : <ShieldCheck className="mr-1 h-3 w-3" />}
      {MODE_LABEL[mode]}
    </Badge>
  );
}

function LastMessageAuthorIcon({ author }: { author?: MessageAuthor | null }) {
  if (author === "BOT") {
    return (
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-700">
        <Bot className="h-3 w-3" />
      </span>
    );
  }
  if (author === "OPERADOR") {
    return (
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700">
        <UserRound className="h-3 w-3" />
      </span>
    );
  }
  if (author === "CONTACTO") {
    return (
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50">
        <WhatsAppIcon className="h-3 w-3" />
      </span>
    );
  }
  return (
    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500">
      <ShieldCheck className="h-3 w-3" />
    </span>
  );
}

export function WhatsAppConsole() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stateFilters, setStateFilters] = useState<ConversationState[]>([]);
  const [priorityFilters, setPriorityFilters] = useState<ConversationPriority[]>([]);
  const [modeFilters, setModeFilters] = useState<NonNullable<Conversation["modo_atencion"]>[]>([]);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<Array<{ file: File; url: string }>>([]);
  const [operatorIds, setOperatorIds] = useState<string[]>([]);
  const [operators, setOperators] = useState<OperatorOption[]>([]);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  // Identifica la acción de conversación en curso (tomar, asignar, cerrar…)
  // para mostrar el Spinner en el botón correspondiente y evitar dobles clics.
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const messagesRequestRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  // Cache de mensajes por conversación: permite mostrar al instante al cambiar
  // de chat mientras se revalida en segundo plano (evita el blanco + espera).
  const messagesCacheRef = useRef<Map<string, ConversationMessage[]>>(new Map());
  // Timer para coalescer refrescos de la lista disparados por el WebSocket.
  const wsRefreshTimerRef = useRef<number | null>(null);

  const counts = useMemo(() => {
    return {
      all: conversations.length,
      active: conversations.filter((item) => item.estado !== "CERRADA").length,
      queue: conversations.filter((item) => item.estado === "EN_COLA").length,
      human: conversations.filter((item) => item.estado === "EN_ATENCION").length,
      bot: conversations.filter((item) => item.estado === "EN_BOT").length,
      closed: conversations.filter((item) => item.estado === "CERRADA").length,
      priority: {
        BAJO: conversations.filter((item) => item.prioridad === "BAJO").length,
        MEDIO: conversations.filter((item) => item.prioridad === "MEDIO").length,
        ALTO: conversations.filter((item) => item.prioridad === "ALTO").length,
        CRITICO: conversations.filter((item) => item.prioridad === "CRITICO").length,
      },
      mode: {
        BOT: conversations.filter((item) => item.modo_atencion === "BOT").length,
        HUMANO: conversations.filter((item) => item.modo_atencion === "HUMANO").length,
      },
    };
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    const filtered = conversations.filter((item) => {
      const matchesState = stateFilters.length ? stateFilters.includes(item.estado) : true;
      const matchesPriority = priorityFilters.length
        ? Boolean(item.prioridad && priorityFilters.includes(item.prioridad))
        : true;
      const matchesMode = modeFilters.length
        ? Boolean(item.modo_atencion && modeFilters.includes(item.modo_atencion))
        : true;
      return matchesState && matchesPriority && matchesMode;
    });
    return [...filtered].sort((a, b) => {
      const priority =
        (b.prioridad ? PRIORITY_RANK[b.prioridad] : 0) -
        (a.prioridad ? PRIORITY_RANK[a.prioridad] : 0);
      if (priority !== 0) return priority;
      return new Date(b.ultimo_mensaje_at).getTime() - new Date(a.ultimo_mensaje_at).getTime();
    });
  }, [conversations, modeFilters, priorityFilters, stateFilters]);

  const selectedConversation = useMemo(
    () =>
      filteredConversations.find((item) => item.id === selectedId) ??
      filteredConversations[0] ??
      null,
    [filteredConversations, selectedId],
  );
  const selectedConversationId = selectedConversation?.id ?? null;

  const loadConversations = useCallback(async () => {
    const params: Record<string, string> = { limit: "100" };
    if (search.trim()) params.search = search.trim();
    const response = await api.get<ConversationListResponse>(
      "/omnicanal/conversaciones",
      { params },
    );
    setConversations(response.items);
    setSelectedId((current) => {
      if (current && response.items.some((item) => item.id === current)) return current;
      return response.items[0]?.id ?? null;
    });
    return response.items;
  }, [search]);

  const loadMessages = useCallback(async (
    conversationId: string,
    options: { clearBeforeLoad?: boolean; showLoader?: boolean } = {},
  ) => {
    const requestId = messagesRequestRef.current + 1;
    messagesRequestRef.current = requestId;
    const showLoader = options.showLoader ?? true;

    if (options.clearBeforeLoad) setMessages([]);
    if (showLoader) setLoadingMessages(true);

    try {
      const response = await api.get<ConversationMessagesResponse>(
        `/omnicanal/conversaciones/${conversationId}/mensajes`,
        { params: { limit: "100" } },
      );
      messagesCacheRef.current.set(conversationId, response.items);
      if (messagesRequestRef.current !== requestId) return;
      setMessages(response.items);
    } finally {
      if (messagesRequestRef.current === requestId && showLoader) {
        setLoadingMessages(false);
      }
    }
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

  // Coalesce ráfagas de eventos del WebSocket en un solo refresco de la lista
  // (el chatbot emite varios eventos por mensaje; sin esto se recargaría la
  // lista de 100 conversaciones en cada uno).
  const scheduleConversationsRefresh = useCallback(() => {
    if (wsRefreshTimerRef.current !== null) return;
    wsRefreshTimerRef.current = window.setTimeout(() => {
      wsRefreshTimerRef.current = null;
      loadConversations().catch((error) => {
        toast.error(resolveErrorMessage(error, "No se pudo refrescar la bandeja."));
      });
    }, 500);
  }, [loadConversations]);

  useEffect(() => {
    selectedIdRef.current = selectedConversation?.id ?? null;
    setOperatorIds(
      selectedConversation?.operadores_asignados?.length
        ? selectedConversation.operadores_asignados.map((operator) => operator.id)
        : selectedConversation?.operador_asignado?.id
          ? [selectedConversation.operador_asignado.id]
          : [],
    );
  }, [selectedConversation]);

  useEffect(() => {
    setLoading(true);
    // Solo carga la lista; el effect de selectedConversationId se encarga de los
    // mensajes (evita el doble fetch inicial de la conversación seleccionada).
    loadConversations()
      .catch((error) => {
        toast.error(resolveErrorMessage(error, "No se pudo cargar la bandeja."));
      })
      .finally(() => setLoading(false));
  }, [loadConversations]);

  useEffect(() => {
    loadOperators().catch((error) => {
      toast.error(resolveErrorMessage(error, "No se pudo cargar operadores."));
    });
  }, [loadOperators]);

  useEffect(() => {
    if (!selectedConversationId) {
      messagesRequestRef.current += 1;
      setMessages([]);
      setLoadingMessages(false);
      return;
    }
    const cached = messagesCacheRef.current.get(selectedConversationId);
    if (cached) {
      // Muestra al instante lo cacheado y revalida en segundo plano (sin blanco).
      messagesRequestRef.current += 1;
      setMessages(cached);
      setLoadingMessages(false);
      loadMessages(selectedConversationId, { showLoader: false }).catch((error) => {
        toast.error(resolveErrorMessage(error, "No se pudo cargar mensajes."));
      });
      return;
    }
    loadMessages(selectedConversationId, { clearBeforeLoad: true }).catch((error) => {
      toast.error(resolveErrorMessage(error, "No se pudo cargar mensajes."));
    });
  }, [loadMessages, selectedConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const previews = attachments.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setAttachmentPreviews(previews);
    return () => previews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [attachments]);

  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;

    const connect = () => {
      buildAuthenticatedOmnicanalWsUrl()
        .then((url) => {
          if (disposed) return;
          socket = new WebSocket(url);
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
            scheduleConversationsRefresh();
            if (data.conversacion_id && data.conversacion_id === selectedIdRef.current) {
              loadMessages(data.conversacion_id, { showLoader: false }).catch((error) => {
                toast.error(resolveErrorMessage(error, "No se pudo refrescar mensajes."));
              });
            }
          };
        })
        .catch(() => {
          setWsConnected(false);
          if (!disposed) reconnectTimer = window.setTimeout(connect, 2500);
        });
    };

    connect();
    return () => {
      disposed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (wsRefreshTimerRef.current) window.clearTimeout(wsRefreshTimerRef.current);
      socket?.close();
    };
  }, [scheduleConversationsRefresh, loadMessages]);

  async function runConversationAction(
    action: () => Promise<unknown>,
    options: { key?: string; successMessage?: string } = {},
  ) {
    const { key, successMessage: success } = options;
    if (key) setPendingAction(key);
    try {
      await action();
      await loadConversations();
      if (selectedConversation) await loadMessages(selectedConversation.id);
      if (success) {
        toast.success(success);
      }
    } catch (error) {
      toast.error(resolveErrorMessage(error, "No se pudo ejecutar la acción."));
    } finally {
      if (key) setPendingAction(null);
    }
  }

  async function handleSend() {
    if (!selectedConversation || (!draft.trim() && attachments.length === 0) || sending) return;
    if (selectedConversation.modo_atencion !== "HUMANO") {
      toast.error("Toma el chat antes de enviar respuestas manuales.");
      return;
    }
    const content = draft.trim();
    const optimisticId =
      content && attachments.length === 0
        ? `optimistic-${selectedConversation.id}-${Date.now()}`
        : null;
    setSending(true);
    if (optimisticId) {
      setMessages((current) => [
        ...current,
        {
          id: optimisticId,
          conversacion_id: selectedConversation.id,
          external_message_id: null,
          direccion: "OUTBOUND",
          autor_tipo: "OPERADOR",
          autor_usuario: null,
          contenido: content,
          tipo_contenido: "text",
          estado_entrega: "sending",
          media: null,
          created_at: new Date().toISOString(),
        },
      ]);
      setDraft("");
    }
    try {
      if (attachments.length > 0) {
        const formData = new FormData();
        attachments.forEach((file) => formData.append("archivos", file));
        if (content) formData.append("caption", content);
        await api.postMultipart<ConversationMessagesResponse>(
          `/omnicanal/conversaciones/${selectedConversation.id}/imagenes`,
          formData,
        );
      } else {
        const sentMessage = await api.post<ConversationMessage>(
          `/omnicanal/conversaciones/${selectedConversation.id}/mensajes`,
          { contenido: content },
        );
        if (optimisticId) {
          setMessages((current) =>
            current.map((message) => (message.id === optimisticId ? sentMessage : message)),
          );
        }
      }
      setDraft("");
      setAttachments([]);
      if (imageInputRef.current) imageInputRef.current.value = "";
      await loadConversations();
      await loadMessages(selectedConversation.id, { showLoader: false });
    } catch (error) {
      if (optimisticId) {
        setMessages((current) =>
          current.map((message) =>
            message.id === optimisticId ? { ...message, estado_entrega: "error" } : message,
          ),
        );
        setDraft(content);
      }
      toast.error(resolveErrorMessage(error, "No se pudo enviar el mensaje."));
    } finally {
      setSending(false);
    }
  }

  async function closeConversation() {
    if (!selectedConversation) return;
    await runConversationAction(
      () =>
        api.post(`/omnicanal/conversaciones/${selectedConversation.id}/cerrar`, {
          motivo: "Cierre operativo desde bandeja.",
        }),
      { key: "cerrar", successMessage: "Chat cerrado correctamente." },
    );
    setCloseConfirmOpen(false);
  }

  const selectedAi = selectedConversation ? getAiClassification(selectedConversation) : null;
  const selectedIncident = selectedConversation?.incidente ?? selectedConversation?.ultimo_incidente ?? null;

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-180 flex-col bg-slate-50 p-6">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Bandeja operativa WhatsApp</h1>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <RealtimeBadge connected={wsConnected} />
          </div>
        </div>
      </header>

      <main className="mt-5 grid min-h-0 flex-1 grid-cols-[390px_minmax(0,1fr)_360px] overflow-hidden rounded-xl border bg-white">
        <aside className="flex min-h-0 flex-col border-r bg-white">
          <div className="space-y-3 border-b p-4">
            <div className="flex items-center gap-2">
              <SearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar contacto o mensaje"
                className="min-w-0 flex-1 border-0 bg-slate-100"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    aria-label="Filtros avanzados"
                    title="Filtros avanzados"
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 space-y-3 p-3">
                  <p className="text-xs font-medium uppercase text-slate-500">
                    Filtros avanzados
                  </p>
                  <ConversationFilter value={stateFilters} onChange={setStateFilters} counts={counts} />
                  <ConversationPriorityFilter
                    value={priorityFilters}
                    onChange={setPriorityFilters}
                    counts={counts.priority}
                  />
                  <ConversationModeFilter
                    value={modeFilters}
                    onChange={setModeFilters}
                    counts={counts.mode}
                  />
                </PopoverContent>
              </Popover>
            </div>
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
                refreshing={loadingMessages}
                onRefresh={() =>
                  loadMessages(selectedConversation.id).catch((error) => {
                    toast.error(resolveErrorMessage(error, "No se pudo actualizar mensajes."));
                  })
                }
              />

              <ScrollArea className="min-h-0 flex-1 p-5">
                {loadingMessages ? (
                  <MessageListSkeleton />
                ) : (
                  <div className="mx-auto flex max-w-4xl flex-col gap-3">
                    {messages.map((message) => (
                      <MessageBubble key={message.id} message={message} />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
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
                      disabled={pendingAction === "reabrir"}
                      onClick={() =>
                        void runConversationAction(
                          () =>
                            api.post(
                              `/omnicanal/conversaciones/${selectedConversation.id}/reabrir`,
                            ),
                          { key: "reabrir", successMessage: "Chat reabierto correctamente." },
                        )
                      }
                    >
                      {pendingAction === "reabrir" ? (
                        <Spinner className="mr-2 h-4 w-4" />
                      ) : (
                        <RotateCcw className="mr-2 h-4 w-4" />
                      )}
                      Reabrir chat
                    </Button>
                  </div>
                ) : (
                  <div className="mx-auto max-w-4xl space-y-2">
                    {selectedConversation.modo_atencion !== "HUMANO" ? (
                      <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
                        <Lock className="h-4 w-4" />
                        Toma el chat para habilitar respuestas manuales.
                      </div>
                    ) : null}
                    {attachmentPreviews.length ? (
                      <div className="flex gap-2 overflow-x-auto rounded-xl border bg-slate-50 p-2">
                        {attachmentPreviews.map((preview, index) => (
                          <div
                            key={`${preview.file.name}-${index}`}
                            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-white"
                          >
                            {/* Previsualización de un blob local (URL.createObjectURL); next/image no optimiza blobs. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={preview.url}
                              alt={preview.file.name}
                              className="h-full w-full object-cover"
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              className="absolute right-1 top-1 h-6 w-6 rounded-full bg-white/90 text-slate-700 shadow-sm"
                              aria-label="Quitar imagen"
                              title="Quitar imagen"
                              onClick={() =>
                                setAttachments((current) =>
                                  current.filter((_, itemIndex) => itemIndex !== index),
                                )
                              }
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex items-end gap-2 rounded-xl border bg-slate-100 p-2">
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(event) => {
                          setAttachments(Array.from(event.target.files ?? []));
                          event.currentTarget.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 shrink-0 text-slate-600"
                        aria-label="Adjuntar imagenes"
                        title="Adjuntar imagenes"
                        disabled={selectedConversation.modo_atencion !== "HUMANO"}
                        onClick={() => imageInputRef.current?.click()}
                      >
                        <ImagePlus className="h-4 w-4" />
                      </Button>
                      <Textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder={
                          selectedConversation.modo_atencion === "HUMANO"
                            ? "Escribe una respuesta operativa..."
                            : "Chat en modo Bot"
                        }
                        disabled={selectedConversation.modo_atencion !== "HUMANO"}
                        className="min-h-10 flex-1 resize-none border-0 bg-transparent px-1 py-2 shadow-none focus-visible:ring-0"
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            void handleSend();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        disabled={
                          selectedConversation.modo_atencion !== "HUMANO" ||
                          (!draft.trim() && attachments.length === 0) ||
                          sending
                        }
                        onClick={() => void handleSend()}
                        className="h-10 w-10 shrink-0 bg-[#001C55] p-0"
                        aria-label="Enviar respuesta"
                        title="Enviar respuesta"
                      >
                        {sending ? (
                          <Spinner className="h-4 w-4" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
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
              <Tabs defaultValue="operacion" className="p-4">
                <TabsList className="grid h-10 w-full grid-cols-2 rounded-lg">
                  <TabsTrigger value="operacion">Operacion</TabsTrigger>
                  <TabsTrigger value="ia">IA</TabsTrigger>
                </TabsList>
                <TabsContent
                  value="operacion"
                  className="mt-4 space-y-4 transition-opacity duration-200 data-[state=active]:opacity-100 data-[state=inactive]:opacity-0"
                >
                  <OperationPanel
                    conversation={selectedConversation}
                    selectedIncident={selectedIncident}
                    operatorIds={operatorIds}
                    operators={operators}
                    pendingAction={pendingAction}
                    onOperatorChange={setOperatorIds}
                    onTake={() =>
                      void runConversationAction(
                        () =>
                          api.post(`/omnicanal/conversaciones/${selectedConversation.id}/tomar`),
                        { key: "tomar", successMessage: "Tomaste el chat. Ya puedes responder." },
                      )
                    }
                    onAssign={() =>
                      void runConversationAction(
                        () =>
                          api.post(
                            `/omnicanal/conversaciones/${selectedConversation.id}/asignar`,
                            { operador_ids: operatorIds },
                          ),
                        { key: "asignar", successMessage: "Asignación actualizada." },
                      )
                    }
                    onActivateBot={() =>
                      void runConversationAction(
                        () =>
                          api.post(
                            `/omnicanal/conversaciones/${selectedConversation.id}/modo-bot`,
                          ),
                        { key: "modo-bot", successMessage: "Bot activado para esta conversación." },
                      )
                    }
                    onClose={() => setCloseConfirmOpen(true)}
                  />
                </TabsContent>
                <TabsContent
                  value="ia"
                  className="mt-4 space-y-4 transition-opacity duration-200 data-[state=active]:opacity-100 data-[state=inactive]:opacity-0"
                >
                  <AiClassificationPanel conversation={selectedConversation} classification={selectedAi} />
                  <ChatbotPanel
                    conversation={selectedConversation}
                    onUpdated={() => void refreshSelectedConversation()}
                  />
                </TabsContent>
              </Tabs>
            </ScrollArea>
          ) : null}
        </aside>
      </main>
      <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cerrar chat</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirmas que deseas cerrar esta conversación? Se archivará el ciclo
              como evidencia, se enviará un mensaje final al contacto y la bandeja
              quedará limpia para un nuevo caso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={pendingAction === "cerrar"}
              onClick={(event) => {
                // Evita que el diálogo se cierre antes de terminar la petición;
                // lo cerramos manualmente en closeConversation al finalizar.
                event.preventDefault();
                void closeConversation();
              }}
            >
              {pendingAction === "cerrar" ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Cerrar chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  counts: {
    all: number;
    queue: number;
    human: number;
    bot: number;
    closed: number;
  };
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

function ConversationPriorityFilter({
  value,
  onChange,
  counts,
}: {
  value: ConversationPriority[];
  onChange: (value: ConversationPriority[]) => void;
  counts: Record<ConversationPriority, number>;
}) {
  const options: Array<{ value: ConversationPriority; label: string }> = [
    { value: "CRITICO", label: `${PRIORITY_LABEL.CRITICO} (${counts.CRITICO})` },
    { value: "ALTO", label: `${PRIORITY_LABEL.ALTO} (${counts.ALTO})` },
    { value: "MEDIO", label: `${PRIORITY_LABEL.MEDIO} (${counts.MEDIO})` },
    { value: "BAJO", label: `${PRIORITY_LABEL.BAJO} (${counts.BAJO})` },
  ];

  return (
    <MultiSelectFilter
      placeholder="Todas las prioridades"
      options={options}
      selected={value}
      onChange={onChange}
    />
  );
}

function ConversationModeFilter({
  value,
  onChange,
  counts,
}: {
  value: NonNullable<Conversation["modo_atencion"]>[];
  onChange: (value: NonNullable<Conversation["modo_atencion"]>[]) => void;
  counts: Record<NonNullable<Conversation["modo_atencion"]>, number>;
}) {
  const options: Array<{ value: NonNullable<Conversation["modo_atencion"]>; label: string }> = [
    { value: "BOT", label: `${MODE_LABEL.BOT} (${counts.BOT})` },
    { value: "HUMANO", label: `${MODE_LABEL.HUMANO} (${counts.HUMANO})` },
  ];

  return (
    <MultiSelectFilter
      placeholder="Todos los modos"
      options={options}
      selected={value}
      onChange={onChange}
    />
  );
}

function OperationPanel({
  conversation,
  selectedIncident,
  operatorIds,
  operators,
  pendingAction,
  onOperatorChange,
  onTake,
  onAssign,
  onActivateBot,
  onClose,
}: {
  conversation: Conversation;
  selectedIncident: Conversation["incidente"];
  operatorIds: string[];
  operators: OperatorOption[];
  pendingAction: string | null;
  onOperatorChange: (value: string[]) => void;
  onTake: () => void;
  onAssign: () => void;
  onActivateBot: () => void;
  onClose: () => void;
}) {
  const isClosed = conversation.estado === "CERRADA";
  const isBotMode = conversation.modo_atencion === "BOT";
  const assignedOperators = conversation.operadores_asignados?.length
    ? conversation.operadores_asignados
    : conversation.operador_asignado
      ? [conversation.operador_asignado]
      : [];
  const operatorOptions = operators.map((operator) => ({
    value: operator.id,
    label: operator.nombre_completo,
  }));

  return (
    <>
      <section className="rounded-lg border bg-white p-3">
        <h2 className="text-sm font-semibold text-slate-900">Detalles</h2>
        <div className="mt-3 grid gap-2">
          <MetadataRow label="Estado" value={STATE_LABEL[conversation.estado]} />
          <MetadataRow
            label="Prioridad"
            value={conversation.prioridad ? PRIORITY_LABEL[conversation.prioridad] : "Sin prioridad"}
            badgeClassName={conversation.prioridad ? priorityTone(conversation.prioridad) : undefined}
          />
          <MetadataRow
            label="Modo"
            value={conversation.modo_atencion ? MODE_LABEL[conversation.modo_atencion] : "Sin modo"}
          />
          {conversation.chatbot && !isClosed ? (
            <MetadataRow
              label="Chatbot"
              value={chatbotStatusLabel(conversation.chatbot.bot_status)}
            />
          ) : null}
          <MetadataRow label="Última actividad" value={formatDateTime(conversation.ultimo_mensaje_at)} />
          <MetadataRow label="Tiempo en cola" value={relativeTime(conversation.created_at)} />
          <MetadataRow label="Creada" value={formatDateTime(conversation.created_at)} />
          <MetadataRow
            label="Operador"
            value={
              assignedOperators.length
                ? assignedOperators.map((operator) => operator.nombre_completo).join(", ")
                : "Sin asignar"
            }
          />
        </div>
      </section>

      <section className="grid gap-2 rounded-lg border bg-white p-3">
        <h2 className="text-sm font-semibold text-slate-900">Acciones</h2>
        <Button
          type="button"
          className="bg-[#001C55]"
          onClick={isBotMode ? onTake : onActivateBot}
          disabled={isClosed || pendingAction === "tomar" || pendingAction === "modo-bot"}
        >
          {(isBotMode && pendingAction === "tomar") ||
          (!isBotMode && pendingAction === "modo-bot") ? (
            <Spinner className="mr-2 h-4 w-4" />
          ) : isBotMode ? (
            <UserCheck className="mr-2 h-4 w-4" />
          ) : (
            <Bot className="mr-2 h-4 w-4" />
          )}
          {isBotMode ? "Tomar chat" : "Activar bot"}
        </Button>
        <div className="grid gap-2">
          <MultiSelectFilter
            placeholder="Asignar operadores"
            options={operatorOptions}
            selected={operatorIds}
            onChange={onOperatorChange}
          />
          <Button
            type="button"
            variant="outline"
            disabled={!operatorIds.length || isClosed || pendingAction === "asignar"}
            onClick={onAssign}
            className="w-full justify-center"
          >
            {pendingAction === "asignar" ? (
              <Spinner className="mr-2 h-4 w-4" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            Actualizar asignación
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild type="button" variant="outline">
            <Link href={`/mensajes/historial?conversacion=${conversation.id}`}>
              <History className="mr-2 h-4 w-4" />
              Historial
            </Link>
          </Button>
        </div>
        <Button
          asChild={Boolean(selectedIncident)}
          type="button"
          variant="outline"
          disabled={!selectedIncident}
          className="justify-start"
        >
          {selectedIncident ? (
            <Link href={`/incidentes/${selectedIncident.id}`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Ir a último incidente
            </Link>
          ) : (
            <>
              <ExternalLink className="mr-2 h-4 w-4" />
              Ir a último incidente
            </>
          )}
        </Button>
        {!isClosed ? (
          <Button type="button" variant="destructive" className="w-full" onClick={onClose}>
            Cerrar chat
          </Button>
        ) : null}
      </section>
    </>
  );
}

function MetadataRow({
  label,
  value,
  badgeClassName,
}: {
  label: string;
  value: string;
  badgeClassName?: string;
}) {
  return (
    <div className="grid grid-cols-[105px_minmax(0,1fr)] items-start gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm">
      <span className="text-xs font-medium uppercase text-slate-500">{label}</span>
      {badgeClassName ? (
        <Badge className={cn("justify-self-end border font-semibold", badgeClassName)}>
          {value}
        </Badge>
      ) : (
        <span className="min-w-0 text-right font-semibold text-slate-900">{value}</span>
      )}
    </div>
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
                <WhatsAppIcon />
                <span className="truncate">{normalizePhone(conversation.telefono_contacto || conversation.external_chat_id)}</span>
              </div>
            </div>
            <span className="shrink-0 text-xs text-slate-500">{relativeTime(conversation.ultimo_mensaje_at)}</span>
          </div>
          <div className="mt-2 flex items-start gap-2 text-sm text-slate-700">
            <LastMessageAuthorIcon author={conversation.ultimo_mensaje_autor_tipo} />
            <p className="line-clamp-2 min-w-0 flex-1">
              {conversation.ultimo_mensaje_preview || "Sin mensajes registrados"}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <ConversationStateBadge state={conversation.estado} />
            {conversation.prioridad ? <ConversationPriorityBadge priority={conversation.prioridad} /> : null}
            {conversation.modo_atencion ? <ConversationModeBadge mode={conversation.modo_atencion} /> : null}
          </div>
        </div>
      </div>
    </button>
  );
}

function ChatHeader({
  conversation,
  onRefresh,
  refreshing,
}: {
  conversation: Conversation;
  onRefresh: () => void;
  refreshing: boolean;
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
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <WhatsAppIcon />
              <span>{normalizePhone(conversation.telefono_contacto || conversation.external_chat_id)}</span>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? (
            <Spinner className="mr-2 h-4 w-4" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Actualizar
        </Button>
      </div>
    </div>
  );
}

function MessageListSkeleton() {
  const rows = [
    { align: "justify-start", width: "w-[68%]" },
    { align: "justify-end", width: "w-[58%]" },
    { align: "justify-start", width: "w-[72%]" },
    { align: "justify-end", width: "w-[46%]" },
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-3">
      {rows.map((row, index) => (
        <div key={index} className={cn("flex", row.align)}>
          <div className={cn("rounded-xl border bg-white px-3 py-3 shadow-sm", row.width)}>
            <div className="mb-3 flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-5/6" />
            <div className="mt-3 flex justify-end">
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: ConversationMessage }) {
  const outgoing = message.direccion === "OUTBOUND";
  const isBot = message.autor_tipo === "BOT";
  const isOperator = message.autor_tipo === "OPERADOR";
  const mediaSrc = message.media?.data_url || message.media?.url || message.media?.thumbnail_data_url;
  const isSending = message.estado_entrega === "sending";
  const hasFailed = message.estado_entrega === "error";

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
        {mediaSrc ? (
          <>
            {/* Media de WhatsApp: data URI o URL del backend fuera del allowlist de next/image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaSrc}
              alt={message.media?.filename || message.contenido || "Imagen de WhatsApp"}
              className="mb-2 max-h-64 w-full rounded-lg border object-contain"
            />
          </>
        ) : null}
        <p className="whitespace-pre-wrap leading-6">
          {message.contenido || `[${message.tipo_contenido}]`}
        </p>
        <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-slate-500">
          <span>{formatTime(message.created_at)}</span>
          {outgoing && isSending ? (
            <>
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Enviando</span>
            </>
          ) : null}
          {outgoing && hasFailed ? <span className="font-medium text-red-600">Error</span> : null}
          {outgoing && !isSending && !hasFailed ? <CheckCircle2 className="h-3 w-3" /> : null}
        </div>
      </div>
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
        {conversation.prioridad ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Severidad</span>
            <Badge className={cn("border font-semibold", priorityTone(conversation.prioridad))}>
              {conversation.prioridad}
            </Badge>
          </div>
        ) : null}
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

type MasterLocation = { id: string; nombre: string };

function LocationCombobox({
  value,
  options,
  onChange,
}: {
  value: string;
  options: MasterLocation[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-white font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || "Selecciona una ubicación"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Buscar ubicación registrada..." />
          <CommandList>
            <CommandEmpty>Sin coincidencias en el maestro.</CommandEmpty>
            <CommandGroup>
              {options.map((loc) => (
                <CommandItem
                  key={loc.id}
                  value={loc.nombre}
                  onSelect={() => {
                    onChange(loc.nombre);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === loc.nombre ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {loc.nombre}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
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
  const [locations, setLocations] = useState<MasterLocation[]>([]);

  useEffect(() => {
    setAiSummary(conversation.chatbot?.ai_summary || "");
    setDraftForm(buildDraftForm(conversation));
  }, [conversation]);

  useEffect(() => {
    let active = true;
    api
      .get<MasterLocation[]>("/maestros/ubicaciones")
      .then((rows) => {
        if (active) setLocations(rows);
      })
      .catch(() => {
        // El combobox queda vacío; el supervisor aún puede registrar el incidente.
      });
    return () => {
      active = false;
    };
  }, []);

  if (!chatbot || conversation.estado === "CERRADA") return null;

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
    } catch (error) {
      toast.error(resolveErrorMessage(error, "No se pudo guardar el borrador."));
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
    } catch (error) {
      toast.error(resolveErrorMessage(error, "No se pudo registrar el incidente."));
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
                  <SelectItem value="BAJO">{PRIORITY_LABEL.BAJO}</SelectItem>
                  <SelectItem value="MEDIO">{PRIORITY_LABEL.MEDIO}</SelectItem>
                  <SelectItem value="ALTO">{PRIORITY_LABEL.ALTO}</SelectItem>
                  <SelectItem value="CRITICO">{PRIORITY_LABEL.CRITICO}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <LocationCombobox
              value={draftForm.lugar_referencia}
              options={locations}
              onChange={(value) =>
                setDraftForm((prev) => ({ ...prev, lugar_referencia: value }))
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" disabled={saving} onClick={() => void saveDraft()}>
                {saving ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Guardando...
                  </>
                ) : (
                  "Guardar borrador"
                )}
              </Button>
              <Button
                type="button"
                className="bg-[#001C55]"
                disabled={creatingIncident || Boolean(conversation.incidente)}
                onClick={() => void createIncidentFromDraft()}
              >
                {conversation.incidente ? (
                  "Incidente ya vinculado"
                ) : creatingIncident ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Registrando...
                  </>
                ) : (
                  "Registrar incidente"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
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
