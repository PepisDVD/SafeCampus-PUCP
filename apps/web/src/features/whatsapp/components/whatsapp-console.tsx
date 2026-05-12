"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Progress,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  cn,
} from "@safecampus/ui-kit";
import { EstadoIncidente, NivelSeveridad } from "@safecampus/shared-types";
import {
  AlertTriangle,
  Bot,
  Clock3,
  MessageCircleMore,
  Phone,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  UserRound,
  UserRoundCheck,
  Zap,
} from "lucide-react";

import {
  whatsappConversationsMock,
  whatsappOperatorLoad,
  whatsappOperators,
  whatsappQuickReplies,
} from "../mock-data";
import type { WhatsAppConversation, WhatsAppQueue } from "../types";

const DEFAULT_OPERATOR = whatsappOperators[0] ?? "Operador SafeCampus";

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("es-PE", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function queueLabel(queue: WhatsAppQueue) {
  return {
    bot: "Bot activo",
    humano: "Atendido por operador",
    esperando: "En cola humana",
    cerrado: "Cerrado",
  }[queue];
}

function queueTone(queue: WhatsAppQueue) {
  return {
    bot: "bg-sky-100 text-sky-700 border-sky-200",
    humano: "bg-emerald-100 text-emerald-700 border-emerald-200",
    esperando: "bg-amber-100 text-amber-700 border-amber-200",
    cerrado: "bg-slate-100 text-slate-600 border-slate-200",
  }[queue];
}

function severityTone(severity: NivelSeveridad) {
  return {
    [NivelSeveridad.BAJO]: "bg-emerald-100 text-emerald-700 border-emerald-200",
    [NivelSeveridad.MEDIO]: "bg-amber-100 text-amber-700 border-amber-200",
    [NivelSeveridad.ALTO]: "bg-orange-100 text-orange-700 border-orange-200",
    [NivelSeveridad.CRITICO]: "bg-rose-100 text-rose-700 border-rose-200",
  }[severity];
}

function incidentTone(status: EstadoIncidente) {
  return {
    [EstadoIncidente.RECIBIDO]: "bg-slate-100 text-slate-700 border-slate-200",
    [EstadoIncidente.EN_EVALUACION]: "bg-amber-100 text-amber-700 border-amber-200",
    [EstadoIncidente.EN_ATENCION]: "bg-blue-100 text-blue-700 border-blue-200",
    [EstadoIncidente.ESCALADO]: "bg-orange-100 text-orange-700 border-orange-200",
    [EstadoIncidente.PENDIENTE_INFO]: "bg-violet-100 text-violet-700 border-violet-200",
    [EstadoIncidente.RESUELTO]: "bg-emerald-100 text-emerald-700 border-emerald-200",
    [EstadoIncidente.CERRADO]: "bg-slate-100 text-slate-600 border-slate-200",
  }[status];
}

function MetricCard({
  title,
  value,
  helper,
  icon: Icon,
}: {
  title: string;
  value: string;
  helper: string;
  icon: typeof MessageCircleMore;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 pt-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-[#001C55]">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
        </div>
        <div className="rounded-2xl bg-[#001C55]/10 p-3 text-[#001C55]">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export function WhatsAppConsole() {
  const [conversations, setConversations] = useState(whatsappConversationsMock);
  const [selectedId, setSelectedId] = useState(whatsappConversationsMock[0]?.id);
  const [search, setSearch] = useState("");
  const [queueFilter, setQueueFilter] = useState<"all" | WhatsAppQueue>("all");
  const [draft, setDraft] = useState("");

  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedId) ??
    conversations[0] ??
    null;

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return conversations.filter((conversation) => {
      if (queueFilter !== "all" && conversation.queue !== queueFilter) {
        return false;
      }
      if (!term) return true;
      return (
        conversation.contactName.toLowerCase().includes(term) ||
        conversation.phone.toLowerCase().includes(term) ||
        conversation.intent.toLowerCase().includes(term) ||
        conversation.lastMessage.toLowerCase().includes(term)
      );
    });
  }, [conversations, queueFilter, search]);

  const summary = useMemo(() => {
    const total = conversations.length;
    const active = conversations.filter((item) => item.queue !== "cerrado").length;
    const waitingHuman = conversations.filter(
      (item) => item.queue === "esperando",
    ).length;
    const linkedIncidents = conversations.filter((item) => item.linkedIncident).length;
    const criticalSignals = conversations.filter(
      (item) =>
        item.linkedIncident?.severidad === NivelSeveridad.CRITICO ||
        item.priority === NivelSeveridad.CRITICO,
    ).length;
    const resolved = conversations.filter((item) => item.resolvedBy !== null);
    const botResolved = resolved.filter((item) => item.resolvedBy === "bot").length;
    const automationRate = resolved.length
      ? Math.round((botResolved / resolved.length) * 100)
      : 0;
    const avgFirstResponse = Math.round(
      conversations.reduce((acc, item) => acc + item.firstResponseSeconds, 0) /
        Math.max(conversations.length, 1),
    );
    const avgSatisfaction =
      conversations
        .filter((item) => item.satisfactionScore !== null)
        .reduce((acc, item) => acc + (item.satisfactionScore ?? 0), 0) /
      Math.max(
        conversations.filter((item) => item.satisfactionScore !== null).length,
        1,
      );
    const botConfidence =
      conversations.reduce((acc, item) => acc + item.botConfidence, 0) /
      Math.max(conversations.length, 1);
    const slaBreaches = conversations.filter((item) => item.slaBreached).length;

    return {
      total,
      active,
      waitingHuman,
      linkedIncidents,
      criticalSignals,
      automationRate,
      avgFirstResponse,
      avgSatisfaction,
      botConfidence,
      slaBreaches,
    };
  }, [conversations]);

  const topIntents = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const conversation of conversations) {
      grouped.set(
        conversation.intent,
        (grouped.get(conversation.intent) ?? 0) + 1,
      );
    }
    return Array.from(grouped.entries())
      .map(([intent, total]) => ({ intent, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [conversations]);

  const queueStats = useMemo(() => {
    return {
      bot: conversations.filter((item) => item.queue === "bot").length,
      humano: conversations.filter((item) => item.queue === "humano").length,
      esperando: conversations.filter((item) => item.queue === "esperando").length,
      cerrado: conversations.filter((item) => item.queue === "cerrado").length,
    };
  }, [conversations]);

  function updateSelectedConversation(
    updater: (conversation: WhatsAppConversation) => WhatsAppConversation,
  ) {
    if (!selectedConversation) return;
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === selectedConversation.id
          ? updater(conversation)
          : conversation,
      ),
    );
  }

  function handleAssign(operatorName: string) {
    updateSelectedConversation((conversation) => ({
      ...conversation,
      assignedOperator: operatorName,
      queue: conversation.queue === "cerrado" ? "cerrado" : "humano",
      needsHumanHandoff: false,
    }));
  }

  function handleTakeOver() {
    updateSelectedConversation((conversation) => ({
      ...conversation,
      queue: conversation.queue === "cerrado" ? "cerrado" : "humano",
      assignedOperator: conversation.assignedOperator ?? DEFAULT_OPERATOR,
      unreadCount: 0,
      needsHumanHandoff: false,
      messages: [
        ...conversation.messages,
        {
          id: `${conversation.id}-takeover-${conversation.messages.length + 1}`,
          author: "sistema",
          text: "Un operador tomo control de la conversacion.",
          createdAt: new Date().toISOString(),
          delivery: "read",
        },
      ],
    }));
  }

  function handleCloseConversation() {
    updateSelectedConversation((conversation) => ({
      ...conversation,
      queue: "cerrado",
      unreadCount: 0,
      resolvedBy: conversation.resolvedBy ?? "humano",
      lastActivityAt: new Date().toISOString(),
      messages: [
        ...conversation.messages,
        {
          id: `${conversation.id}-close-${conversation.messages.length + 1}`,
          author: "sistema",
          text: "La conversacion fue cerrada desde la consola operativa.",
          createdAt: new Date().toISOString(),
          delivery: "read",
        },
      ],
    }));
  }

  function handleSendMessage(text?: string) {
    const content = (text ?? draft).trim();
    if (!content || !selectedConversation) return;

    updateSelectedConversation((conversation) => ({
      ...conversation,
      queue: conversation.queue === "cerrado" ? "humano" : conversation.queue,
      assignedOperator: conversation.assignedOperator ?? DEFAULT_OPERATOR,
      unreadCount: 0,
      lastMessage: content,
      lastActivityAt: new Date().toISOString(),
      messages: [
        ...conversation.messages,
        {
          id: `${conversation.id}-reply-${conversation.messages.length + 1}`,
          author: "operador",
          text: content,
          createdAt: new Date().toISOString(),
          delivery: "sent",
        },
      ],
    }));

    setDraft("");
  }

  return (
    <div className="w-full min-w-0 space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-[#001C55]">
              Consola WhatsApp operativa
            </h1>
            <Badge className="border-sky-200 bg-sky-50 text-sky-700">
              Prototipo frontend
            </Badge>
            <Badge variant="outline">Sin backend ni BD</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Bandeja, gestion de chats y dashboard del chatbot para SafeCampus,
            diseñados sobre mocks alineados al dominio de incidentes.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Conversaciones activas"
            value={String(summary.active)}
            helper="Cola operativa actual"
            icon={MessageCircleMore}
          />
          <MetricCard
            title="Esperando humano"
            value={String(summary.waitingHuman)}
            helper="Pendientes de takeover"
            icon={Clock3}
          />
          <MetricCard
            title="Casos criticos"
            value={String(summary.criticalSignals)}
            helper="Chats con severidad critica"
            icon={ShieldAlert}
          />
          <MetricCard
            title="Resolucion bot"
            value={`${summary.automationRate}%`}
            helper="Sobre chats ya resueltos"
            icon={Sparkles}
          />
        </div>
      </div>

      <Alert className="border-[#001C55]/15 bg-[#001C55]/5">
        <Sparkles className="h-4 w-4 text-[#001C55]" />
        <AlertTitle>Arquitectura de prototipo</AlertTitle>
        <AlertDescription>
          Esta consola usa datos mock y asume que a futuro el flujo real sera Meta
          → FastAPI → sc_omnicanal/sc_incidentes → apps/web. La documentacion
          detallada esta en <span className="font-medium">docs/ARQUITECTURA_WHATSAPP_SAFECAMPUS.md</span>.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="bandeja" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bandeja">Bandeja y gestion</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard chatbot</TabsTrigger>
        </TabsList>

        <TabsContent value="bandeja" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)_320px]">
            <Card className="min-h-195">
              <CardHeader className="space-y-3">
                <div>
                  <CardTitle>Bandeja WhatsApp</CardTitle>
                  <CardDescription>
                    Cola de conversaciones priorizadas para operadores.
                  </CardDescription>
                </div>

                <div className="relative">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por nombre, telefono o intencion"
                    className="pl-9"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "all", label: "Todas", total: summary.total },
                    { value: "esperando", label: "En cola", total: queueStats.esperando },
                    { value: "humano", label: "Humano", total: queueStats.humano },
                    { value: "bot", label: "Bot", total: queueStats.bot },
                  ].map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={queueFilter === option.value ? "default" : "outline"}
                      className="justify-between"
                      onClick={() =>
                        setQueueFilter(option.value as "all" | WhatsAppQueue)
                      }
                    >
                      <span>{option.label}</span>
                      <Badge variant="secondary">{option.total}</Badge>
                    </Button>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <ScrollArea className="h-155 px-3 pb-3">
                  <div className="space-y-2">
                    {filteredConversations.map((conversation) => {
                      const active = conversation.id === selectedConversation?.id;
                      return (
                        <button
                          key={conversation.id}
                          type="button"
                          onClick={() => setSelectedId(conversation.id)}
                          className={cn(
                            "w-full rounded-2xl border p-3 text-left transition",
                            active
                              ? "border-[#001C55] bg-[#001C55]/5 shadow-sm"
                              : "border-slate-200 bg-white hover:bg-slate-50",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate font-semibold text-slate-900">
                                  {conversation.contactName}
                                </p>
                                {conversation.unreadCount > 0 ? (
                                  <span className="rounded-full bg-[#001C55] px-2 py-0.5 text-[11px] font-semibold text-white">
                                    {conversation.unreadCount}
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {conversation.phone}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatTime(conversation.lastActivityAt)}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge className={cn("border", queueTone(conversation.queue))}>
                              {queueLabel(conversation.queue)}
                            </Badge>
                            <Badge
                              className={cn(
                                "border",
                                severityTone(conversation.priority),
                              )}
                            >
                              {conversation.priority}
                            </Badge>
                          </div>

                          <p className="mt-3 line-clamp-2 text-sm text-slate-700">
                            {conversation.lastMessage}
                          </p>

                          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span>Intent: {conversation.intent}</span>
                            <span>
                              {conversation.assignedOperator ?? "Sin asignar"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="min-h-195">
              {selectedConversation ? (
                <>
                  <CardHeader className="gap-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-11 w-11 border">
                          <AvatarFallback className="bg-[#001C55]/10 font-semibold text-[#001C55]">
                            {selectedConversation.contactName
                              .split(" ")
                              .map((value) => value[0])
                              .join("")
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">
                            {selectedConversation.contactName}
                          </CardTitle>
                          <CardDescription className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              {selectedConversation.phone}
                            </span>
                            <span>·</span>
                            <span>
                              Ultima actividad {formatDateTime(selectedConversation.lastActivityAt)}
                            </span>
                          </CardDescription>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge className={cn("border", queueTone(selectedConversation.queue))}>
                          {queueLabel(selectedConversation.queue)}
                        </Badge>
                        <Badge
                          className={cn(
                            "border",
                            severityTone(selectedConversation.priority),
                          )}
                        >
                          {selectedConversation.priority}
                        </Badge>
                        {selectedConversation.slaBreached ? (
                          <Badge className="border-rose-200 bg-rose-50 text-rose-700">
                            SLA en riesgo
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_140px_140px]">
                      <Select
                        value={selectedConversation.assignedOperator ?? "unassigned"}
                        onValueChange={(value) => {
                          if (value !== "unassigned") handleAssign(value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Asignar operador" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Sin asignar</SelectItem>
                          {whatsappOperators.map((operator) => (
                            <SelectItem key={operator} value={operator}>
                              {operator}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" onClick={handleTakeOver}>
                        <UserRoundCheck className="mr-2 h-4 w-4" />
                        Takeover
                      </Button>
                      <Button type="button" variant="outline" onClick={handleCloseConversation}>
                        Cerrar chat
                      </Button>
                      <Button type="button">
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Escalar
                      </Button>
                    </div>
                  </CardHeader>

                  <Separator />

                  <CardContent className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_260px]">
                    <div className="space-y-4">
                      <ScrollArea className="h-125 rounded-2xl border bg-slate-50/70 p-4">
                        <div className="space-y-3">
                          {selectedConversation.messages.map((message) => {
                            const isUser = message.author === "usuario";
                            const isSystem = message.author === "sistema";
                            return (
                              <div
                                key={message.id}
                                className={cn(
                                  "flex",
                                  isSystem
                                    ? "justify-center"
                                    : isUser
                                      ? "justify-start"
                                      : "justify-end",
                                )}
                              >
                                <div
                                  className={cn(
                                    "max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                                    isSystem
                                      ? "bg-slate-200 text-slate-600"
                                      : isUser
                                        ? "bg-white text-slate-800"
                                        : "bg-[#001C55] text-white",
                                  )}
                                >
                                  <div className="mb-1 flex items-center gap-2 text-[11px] font-medium opacity-80">
                                    <span className="capitalize">{message.author}</span>
                                    <span>·</span>
                                    <span>{formatTime(message.createdAt)}</span>
                                  </div>
                                  <p className="leading-6">{message.text}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>

                      <div className="rounded-2xl border bg-white p-4">
                        <div className="flex flex-wrap gap-2">
                          {whatsappQuickReplies.map((reply) => (
                            <Button
                              key={reply.id}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setDraft(reply.text)}
                            >
                              {reply.label}
                            </Button>
                          ))}
                        </div>

                        <div className="mt-4 space-y-3">
                          <Textarea
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            placeholder="Escribe una respuesta para el usuario..."
                            className="min-h-28"
                          />
                          <div className="flex justify-end">
                            <Button type="button" onClick={() => handleSendMessage()}>
                              <Send className="mr-2 h-4 w-4" />
                              Enviar respuesta
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Ficha del chat</CardTitle>
                          <CardDescription>
                            Señales que luego deberan persistirse en `sc_omnicanal`.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-muted-foreground">Operador</span>
                            <span className="text-right font-medium text-slate-900">
                              {selectedConversation.assignedOperator ?? "Sin asignar"}
                            </span>
                          </div>
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-muted-foreground">Intencion</span>
                            <span className="text-right font-medium text-slate-900">
                              {selectedConversation.intent}
                            </span>
                          </div>
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-muted-foreground">Confianza bot</span>
                            <span className="font-medium text-slate-900">
                              {Math.round(selectedConversation.botConfidence * 100)}%
                            </span>
                          </div>
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-muted-foreground">Primera respuesta</span>
                            <span className="font-medium text-slate-900">
                              {selectedConversation.firstResponseSeconds}s
                            </span>
                          </div>
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-muted-foreground">Sentimiento</span>
                            <span className="font-medium text-slate-900">
                              {selectedConversation.sentimentScore.toFixed(1)} / 5
                            </span>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Resumen IA
                            </p>
                            <p className="leading-6 text-slate-700">
                              {selectedConversation.aiSummary}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Playbook sugerido
                            </p>
                            <p className="leading-6 text-slate-700">
                              {selectedConversation.recommendedPlaybook}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {selectedConversation.tags.map((tag) => (
                              <Badge key={tag} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Incidente vinculado</CardTitle>
                          <CardDescription>
                            Relacion futura con `sc_incidentes`.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {selectedConversation.linkedIncident ? (
                            <div className="space-y-3 text-sm">
                              <div>
                                <p className="font-semibold text-slate-900">
                                  {selectedConversation.linkedIncident.codigo}
                                </p>
                                <p className="mt-1 text-slate-700">
                                  {selectedConversation.linkedIncident.titulo}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  className={cn(
                                    "border",
                                    incidentTone(selectedConversation.linkedIncident.estado),
                                  )}
                                >
                                  {selectedConversation.linkedIncident.estado}
                                </Badge>
                                <Badge
                                  className={cn(
                                    "border",
                                    severityTone(
                                      selectedConversation.linkedIncident.severidad,
                                    ),
                                  )}
                                >
                                  {selectedConversation.linkedIncident.severidad}
                                </Badge>
                              </div>
                              <div className="rounded-xl bg-slate-50 p-3 text-slate-700">
                                Zona: {selectedConversation.linkedIncident.zona}
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                              Esta conversacion aun no esta vinculada a un
                              incidente. En backend deberia poder crear o enlazar
                              un caso desde aqui.
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </>
              ) : null}
            </Card>

            <Card className="min-h-195">
              <CardHeader>
                <CardTitle>Salud de la cola</CardTitle>
                <CardDescription>
                  KPIs operativos rapidos mientras se atiende la bandeja.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">
                      Automatizacion efectiva
                    </span>
                    <span className="font-semibold text-[#001C55]">
                      {summary.automationRate}%
                    </span>
                  </div>
                  <Progress value={summary.automationRate} />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">
                      Confianza promedio del bot
                    </span>
                    <span className="font-semibold text-[#001C55]">
                      {Math.round(summary.botConfidence * 100)}%
                    </span>
                  </div>
                  <Progress value={Math.round(summary.botConfidence * 100)} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-2xl border bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <Zap className="h-4 w-4 text-amber-600" />
                      Tiempo medio de primera respuesta
                    </div>
                    <p className="mt-3 text-3xl font-bold text-[#001C55]">
                      {summary.avgFirstResponse}s
                    </p>
                  </div>
                  <div className="rounded-2xl border bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <Bot className="h-4 w-4 text-sky-600" />
                      Satisfaccion estimada
                    </div>
                    <p className="mt-3 text-3xl font-bold text-[#001C55]">
                      {summary.avgSatisfaction.toFixed(1)} / 5
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-800">
                      Alertas de SLA
                    </span>
                    <Badge className="border-rose-200 bg-rose-50 text-rose-700">
                      {summary.slaBreaches}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {conversations
                      .filter((conversation) => conversation.slaBreached)
                      .map((conversation) => (
                        <button
                          key={conversation.id}
                          type="button"
                          onClick={() => setSelectedId(conversation.id)}
                          className="w-full rounded-xl border border-rose-100 bg-rose-50 p-3 text-left"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-rose-800">
                              {conversation.contactName}
                            </span>
                            <span className="text-xs text-rose-700">
                              {conversation.firstResponseSeconds}s
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-rose-700">
                            {conversation.intent}
                          </p>
                        </button>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>Resumen ejecutivo del chatbot</CardTitle>
                <CardDescription>
                  Lectura operativa de salud del canal WhatsApp para SafeCampus.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Conversaciones totales
                  </p>
                  <p className="mt-2 text-3xl font-bold text-[#001C55]">
                    {summary.total}
                  </p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Vinculadas a incidentes
                  </p>
                  <p className="mt-2 text-3xl font-bold text-[#001C55]">
                    {summary.linkedIncidents}
                  </p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Casos criticos
                  </p>
                  <p className="mt-2 text-3xl font-bold text-[#001C55]">
                    {summary.criticalSignals}
                  </p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Bot confidence promedio
                  </p>
                  <p className="mt-2 text-3xl font-bold text-[#001C55]">
                    {Math.round(summary.botConfidence * 100)}%
                  </p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Esperando takeover
                  </p>
                  <p className="mt-2 text-3xl font-bold text-[#001C55]">
                    {summary.waitingHuman}
                  </p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Satisfaccion promedio
                  </p>
                  <p className="mt-2 text-3xl font-bold text-[#001C55]">
                    {summary.avgSatisfaction.toFixed(1)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribucion de colas</CardTitle>
                <CardDescription>
                  Reparto actual entre bot, operadores y conversaciones cerradas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {([
                  ["bot", queueStats.bot],
                  ["humano", queueStats.humano],
                  ["esperando", queueStats.esperando],
                  ["cerrado", queueStats.cerrado],
                ] as const).map(([queue, total]) => {
                  const percentage = Math.round((total / Math.max(summary.total, 1)) * 100);
                  return (
                    <div key={queue} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-800">
                          {queueLabel(queue)}
                        </span>
                        <span className="font-semibold text-[#001C55]">
                          {total} · {percentage}%
                        </span>
                      </div>
                      <Progress value={percentage} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Top intenciones detectadas</CardTitle>
                <CardDescription>
                  Entradas con mas volumen para el chatbot y la cola humana.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Intencion</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topIntents.map((intent) => (
                      <TableRow key={intent.intent}>
                        <TableCell className="font-medium text-slate-900">
                          {intent.intent}
                        </TableCell>
                        <TableCell>{intent.total}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Carga por operador</CardTitle>
                <CardDescription>
                  Vista mock de distribucion operativa para takeover y seguimiento.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operador</TableHead>
                      <TableHead>Chats activos</TableHead>
                      <TableHead>En espera</TableHead>
                      <TableHead>Escalados</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {whatsappOperatorLoad.map((operator) => (
                      <TableRow key={operator.name}>
                        <TableCell className="font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <UserRound className="h-4 w-4 text-[#001C55]" />
                            {operator.name}
                          </div>
                        </TableCell>
                        <TableCell>{operator.activeChats}</TableCell>
                        <TableCell>{operator.waitingChats}</TableCell>
                        <TableCell>{operator.escalatedCases}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}