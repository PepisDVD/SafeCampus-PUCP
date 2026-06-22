"use client";

import React, { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Badge,
  Button,
  FilterBar,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@safecampus/ui-kit";
import {
  Activity,
  AlertTriangle,
  Bot,
  Clock,
  Layers,
  MessageSquare,
  RefreshCw,
  Zap,
} from "lucide-react";
import type { LlmUsageStatsResponse } from "../../services/llm-audit.service";

type LlmDashboardClientProps = {
  stats: LlmUsageStatsResponse;
  initialDesde?: string;
  initialHasta?: string;
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function providerColor(provider: string): string {
  const p = provider.toLowerCase();
  if (p.includes("openai")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (p.includes("gemini") || p.includes("google")) return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

// Simplified bar chart for tokens per day
function TokensBarChart({
  data,
}: {
  data: Array<{ day: string; total_tokens: number; calls: number }>;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        Sin datos en el rango seleccionado
      </div>
    );
  }

  const maxTokens = Math.max(...data.map((d) => d.total_tokens), 1);
  // Show at most last 30 points
  const visible = data.slice(-30);

  return (
    <div className="mt-2">
      <div className="flex h-28 items-end gap-0.5">
        {visible.map((d) => {
          const heightPct = (d.total_tokens / maxTokens) * 100;
          return (
            <div
              key={d.day}
              className="group relative flex-1"
              title={`${d.day}: ${formatTokens(d.total_tokens)} tokens (${d.calls} llamadas)`}
            >
              <div
                className="w-full rounded-t-sm bg-indigo-400 transition-all group-hover:bg-indigo-500"
                style={{ height: `${Math.max(heightPct, 2)}%` }}
              />
              {/* Tooltip */}
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded border bg-white px-2 py-1 text-xs shadow group-hover:block">
                <p className="font-medium">{d.day}</p>
                <p>{formatTokens(d.total_tokens)} tok · {d.calls} llamadas</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{visible[0]?.day ?? ""}</span>
        <span>{visible[visible.length - 1]?.day ?? ""}</span>
      </div>
    </div>
  );
}

export function LlmDashboardClient({
  stats,
  initialDesde = "",
  initialHasta = "",
}: LlmDashboardClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [desde, setDesde] = useState(initialDesde);
  const [hasta, setHasta] = useState(initialHasta);

  function applyRange() {
    const params = new URLSearchParams();
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function clearRange() {
    setDesde("");
    setHasta("");
    startTransition(() => router.push(pathname));
  }

  const promptPct =
    stats.total_tokens > 0
      ? Math.round((stats.prompt_tokens / stats.total_tokens) * 100)
      : 0;
  const completionPct =
    stats.total_tokens > 0
      ? Math.round((stats.completion_tokens / stats.total_tokens) * 100)
      : 0;

  return (
    <div className={`space-y-6 transition-opacity ${isPending ? "opacity-60" : ""}`}>
      {/* Date range filter */}
      <FilterBar className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Desde
          </label>
          <Input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="h-8 text-xs w-40"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Hasta
          </label>
          <Input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="h-8 text-xs w-40"
          />
        </div>
        <Button size="sm" onClick={applyRange} disabled={isPending}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Actualizar
        </Button>
        {(desde || hasta) && (
          <Button
            size="sm"
            variant="outline"
            onClick={clearRange}
            disabled={isPending}
          >
            Limpiar
          </Button>
        )}
      </FilterBar>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          icon={<Zap className="h-4 w-4 text-indigo-600" />}
          label="Llamadas LLM"
          value={String(stats.total_calls)}
          accent="indigo"
        />
        <KpiCard
          icon={<Layers className="h-4 w-4 text-blue-600" />}
          label="Tokens totales"
          value={formatTokens(stats.total_tokens)}
          accent="blue"
        />
        <KpiCard
          icon={<Activity className="h-4 w-4 text-violet-600" />}
          label="Tokens prompt"
          value={formatTokens(stats.prompt_tokens)}
          sub={`${promptPct}% del total`}
          accent="violet"
        />
        <KpiCard
          icon={<Bot className="h-4 w-4 text-emerald-600" />}
          label="Tokens respuesta"
          value={formatTokens(stats.completion_tokens)}
          sub={`${completionPct}% del total`}
          accent="emerald"
        />
        <KpiCard
          icon={<Clock className="h-4 w-4 text-amber-600" />}
          label="Latencia promedio"
          value={
            stats.avg_latency_ms != null
              ? `${Math.round(stats.avg_latency_ms)} ms`
              : "—"
          }
          accent="amber"
        />
        <KpiCard
          icon={<MessageSquare className="h-4 w-4 text-sky-600" />}
          label="Conversaciones"
          value={String(stats.unique_conversations)}
          accent="sky"
        />
      </div>

      {/* Fallback alert */}
      {stats.fallback_rate > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <span className="font-semibold">
              Tasa de fallback: {pct(stats.fallback_rate)}
            </span>{" "}
            — Se activó el proveedor de respaldo en{" "}
            {Math.round(stats.fallback_rate * stats.total_calls)} de{" "}
            {stats.total_calls} llamadas.
          </div>
        </div>
      )}

      {/* Tokens per day chart */}
      <div className="rounded-lg border bg-white p-5">
        <h3 className="mb-1 text-sm font-semibold text-slate-800">
          Tokens por dia
        </h3>
        <p className="mb-2 text-xs text-muted-foreground">
          Consumo diario de tokens (prompt + completion)
        </p>
        <TokensBarChart data={stats.tokens_per_day} />
      </div>

      {/* Per-provider breakdown */}
      {stats.by_provider.length > 0 && (
        <div className="rounded-lg border bg-white">
          <div className="border-b px-5 py-3">
            <h3 className="text-sm font-semibold text-slate-800">
              Consumo por proveedor
            </h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs">Proveedor</TableHead>
                <TableHead className="text-right text-xs">Llamadas</TableHead>
                <TableHead className="text-right text-xs">Prompt tok.</TableHead>
                <TableHead className="text-right text-xs">Completion tok.</TableHead>
                <TableHead className="text-right text-xs">Total tok.</TableHead>
                <TableHead className="text-right text-xs">Lat. prom.</TableHead>
                <TableHead className="text-right text-xs">Fallbacks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.by_provider.map((p) => (
                <TableRow key={p.provider}>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${providerColor(p.provider)}`}
                    >
                      {p.provider}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {p.total_calls}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {formatTokens(p.prompt_tokens)}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {formatTokens(p.completion_tokens)}
                  </TableCell>
                  <TableCell className="text-right text-xs font-semibold tabular-nums">
                    {formatTokens(p.total_tokens)}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                    {p.avg_latency_ms != null
                      ? `${Math.round(p.avg_latency_ms)} ms`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {p.fallback_count > 0 ? (
                      <span className="text-amber-600">{p.fallback_count}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KpiCard sub-component
// ---------------------------------------------------------------------------

type Accent = "indigo" | "blue" | "violet" | "emerald" | "amber" | "sky";

const accentMap: Record<Accent, string> = {
  indigo: "text-indigo-600",
  blue: "text-blue-600",
  violet: "text-violet-600",
  emerald: "text-emerald-600",
  amber: "text-amber-600",
  sky: "text-sky-600",
};

function KpiCard({
  icon,
  label,
  value,
  sub,
  accent = "indigo",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: Accent;
}) {
  return (
    <div className="col-span-1 rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-1.5">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${accentMap[accent]}`}>
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
      )}
    </div>
  );
}
