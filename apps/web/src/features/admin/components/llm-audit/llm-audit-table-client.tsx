"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Badge,
  Button,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  FilterBar,
  Input,
  MultiSelectFilter,
  SearchInput,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@safecampus/ui-kit";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  Filter,
  Zap,
} from "lucide-react";
import type { LlmUsageItem, LlmUsageListResponse } from "../../services/llm-audit.service";

type LlmAuditTableClientProps = {
  initialData: LlmUsageListResponse;
  providers: string[];
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const lima = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  const months = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "set.", "oct.", "nov.", "dic."];
  const day = String(lima.getUTCDate()).padStart(2, "0");
  const month = months[lima.getUTCMonth()];
  const year = lima.getUTCFullYear();
  const hour = String(lima.getUTCHours()).padStart(2, "0");
  const min = String(lima.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hour}:${min}`;
}

function shortId(id: string): string {
  return id.slice(0, 8) + "…";
}

function providerColor(provider: string): string {
  const p = provider.toLowerCase();
  if (p.includes("openai")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (p.includes("gemini") || p.includes("google")) return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function LlmAuditTableClient({
  initialData,
  providers,
}: LlmAuditTableClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [selectedItem, setSelectedItem] = useState<LlmUsageItem | null>(null);

  // Local filter state (synced to URL on submit)
  const [conversacionId, setConversacionId] = useState(
    searchParams.get("conversacion_id") ?? "",
  );
  const [providerFilters, setProviderFilters] = useState<string[]>(
    searchParams.get("provider")?.split(",").filter(Boolean) ?? [],
  );
  const [desde, setDesde] = useState(searchParams.get("desde") ?? "");
  const [hasta, setHasta] = useState(searchParams.get("hasta") ?? "");

  function applyFilters(page = 1) {
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (conversacionId.trim()) params.set("conversacion_id", conversacionId.trim());
    if (providerFilters.length) params.set("provider", providerFilters.join(","));
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const { items, total, page, pages } = initialData;

  return (
    <div className="space-y-5">
      {/* Filters */}
      <FilterBar>
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
          <Filter className="h-4 w-4" />
          Filtros
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              ID de conversación
            </label>
            <SearchInput
              value={conversacionId}
              onChange={(e) => setConversacionId(e.target.value)}
              placeholder="UUID de conversación..."
              className="h-8 text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Proveedor
            </label>
            <MultiSelectFilter
              className="h-8 text-xs"
              placeholder="Todos los proveedores"
              options={providers.map((provider) => ({
                value: provider,
                label: provider,
              }))}
              selected={providerFilters}
              onChange={setProviderFilters}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Desde
            </label>
            <Input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="h-8 text-xs"
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
              className="h-8 text-xs"
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            onClick={() => applyFilters(1)}
            disabled={isPending}
          >
            Aplicar filtros
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setConversacionId("");
              setProviderFilters([]);
              setDesde("");
              setHasta("");
              startTransition(() => router.push(pathname));
            }}
            disabled={isPending}
          >
            Limpiar
          </Button>
        </div>
      </FilterBar>

      {/* Table */}
      <div
        className={`overflow-hidden rounded-lg border bg-white transition-opacity ${
          isPending ? "opacity-60 pointer-events-none" : ""
        }`}
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="text-xs">Fecha</TableHead>
              <TableHead className="text-xs">Conversacion</TableHead>
              <TableHead className="text-xs">Proveedor / Modelo</TableHead>
              <TableHead className="text-right text-xs">Prompt tok.</TableHead>
              <TableHead className="text-right text-xs">Completion tok.</TableHead>
              <TableHead className="text-right text-xs">Total tok.</TableHead>
              <TableHead className="text-right text-xs">Latencia</TableHead>
              <TableHead className="text-xs">Fallback</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center">
                  <Zap className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    No hay registros que coincidan con los filtros.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => setSelectedItem(item)}
                >
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDate(item.created_at)}
                  </TableCell>
                  <TableCell>
                    <span
                      className="font-mono text-xs text-slate-600"
                      title={item.conversacion_id}
                    >
                      {shortId(item.conversacion_id)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <Badge
                        variant="outline"
                        className={`text-xs ${providerColor(item.provider)}`}
                      >
                        {item.provider}
                      </Badge>
                      <p className="text-xs text-muted-foreground truncate max-w-35">
                        {item.model}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {formatTokens(item.prompt_tokens)}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {formatTokens(item.completion_tokens)}
                  </TableCell>
                  <TableCell className="text-right text-xs font-semibold tabular-nums">
                    {formatTokens(item.total_tokens)}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                    {item.latency_ms != null ? `${item.latency_ms} ms` : "—"}
                  </TableCell>
                  <TableCell>
                    {item.fallback_applied ? (
                      <Badge
                        variant="outline"
                        className="text-xs bg-amber-50 text-amber-700 border-amber-200"
                      >
                        Fallback
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total === 0
            ? "Sin resultados"
            : `${(page - 1) * initialData.page_size + 1}–${Math.min(
                page * initialData.page_size,
                total,
              )} de ${total} registros`}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={page <= 1 || isPending}
            onClick={() => goToPage(1)}
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={page <= 1 || isPending}
            onClick={() => goToPage(page - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="px-2 text-xs">
            Pág. {page} / {pages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={page >= pages || isPending}
            onClick={() => goToPage(page + 1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={page >= pages || isPending}
            onClick={() => goToPage(pages)}
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Detail side panel */}
      <Drawer
        direction="right"
        open={!!selectedItem}
        onOpenChange={(open) => {
          if (!open) setSelectedItem(null);
        }}
      >
        <DrawerContent
          className="sm:max-w-xl data-[state=open]:duration-300 data-[state=closed]:duration-200 data-[state=open]:ease-out data-[state=closed]:ease-in"
        >
          <DrawerHeader className="border-b pb-4">
            <DrawerTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-amber-500" />
              Detalle de uso LLM
            </DrawerTitle>
            <DrawerDescription>
              Registro detallado de una invocación del chatbot LLM.
            </DrawerDescription>
          </DrawerHeader>
          {selectedItem && (
            <div className="space-y-4 overflow-y-auto px-4 pb-4 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <DetailRow label="ID" value={selectedItem.id} mono />
                <DetailRow
                  label="Fecha"
                  value={formatDate(selectedItem.created_at)}
                />
                <DetailRow
                  label="Conversacion"
                  value={selectedItem.conversacion_id}
                  mono
                />
                {selectedItem.incidente_id && (
                  <DetailRow
                    label="Incidente"
                    value={selectedItem.incidente_id}
                    mono
                  />
                )}
                <DetailRow label="Proveedor" value={selectedItem.provider} />
                <DetailRow label="Modelo" value={selectedItem.model} />
                {selectedItem.prompt_version && (
                  <DetailRow
                    label="Version prompt"
                    value={selectedItem.prompt_version}
                  />
                )}
                <DetailRow
                  label="Prompt tokens"
                  value={String(selectedItem.prompt_tokens)}
                />
                <DetailRow
                  label="Completion tokens"
                  value={String(selectedItem.completion_tokens)}
                />
                <DetailRow
                  label="Total tokens"
                  value={String(selectedItem.total_tokens)}
                />
                <DetailRow
                  label="Latencia"
                  value={
                    selectedItem.latency_ms != null
                      ? `${selectedItem.latency_ms} ms`
                      : "—"
                  }
                />
                <DetailRow
                  label="Fallback"
                  value={selectedItem.fallback_applied ? "Sí" : "No"}
                />
                {selectedItem.fallback_reason && (
                  <DetailRow
                    label="Razon fallback"
                    value={selectedItem.fallback_reason}
                  />
                )}
                <DetailRow
                  label="Correlation ID"
                  value={selectedItem.correlation_id}
                  mono
                />
              </div>
            </div>
          )}
          <DrawerFooter className="border-t">
            <DrawerClose asChild>
              <Button type="button" variant="outline">
                Cerrar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="col-span-2 grid grid-cols-[140px_1fr] items-start gap-2 border-b border-slate-100 pb-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={`break-all text-xs text-slate-800 ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
