"use client";

import React, { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePaginationBar,
  TableRow,
} from "@safecampus/ui-kit";
import { ClipboardList, Filter, SlidersHorizontal } from "lucide-react";
import type {
  AuditoriaListResponse,
  AuditoriaUsuarioRef,
  RegistroAuditoria,
} from "../../services/auditoria.service";

type AuditoriaClientProps = {
  initialData: AuditoriaListResponse;
  modulos: string[];
  acciones: string[];
  usuarios: AuditoriaUsuarioRef[];
};

// Chips rápidos -> grupos de módulos (sólo aplican filtro, no crean tabs).
const CHIP_GROUPS: { label: string; modulos: string[] | null }[] = [
  { label: "Todos", modulos: null },
  {
    label: "Administración",
    modulos: ["usuarios", "roles", "ubicaciones", "lost_found", "gis", "configuracion"],
  },
  { label: "Incidentes", modulos: ["incidentes"] },
  { label: "Alertas", modulos: ["alertas"] },
  { label: "Seguridad", modulos: ["seguridad"] },
  { label: "Integraciones", modulos: ["integraciones"] },
];

const RESULTADO_OPTIONS = [
  { value: "exitoso", label: "Exitoso" },
  { value: "fallido", label: "Fallido" },
  { value: "denegado", label: "Denegado" },
];

const DATE_PRESETS = [
  { value: "30d", label: "Últimos 30 días" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "hoy", label: "Hoy" },
  { value: "custom", label: "Rango personalizado" },
];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function prettify(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const lima = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  const months = ["ene.","feb.","mar.","abr.","may.","jun.","jul.","ago.","set.","oct.","nov.","dic."];
  const day = String(lima.getUTCDate()).padStart(2, "0");
  const month = months[lima.getUTCMonth()];
  const year = lima.getUTCFullYear();
  const hour = String(lima.getUTCHours()).padStart(2, "0");
  const min = String(lima.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hour}:${min}`;
}

function accionColor(accion: string): string {
  const a = accion.toLowerCase();
  if (a.includes("crear") || a.includes("registrar") || a.includes("alta") || a.includes("publicar") || a.includes("activar")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (a.includes("eliminar") || a.includes("suspender") || a.includes("revocar") || a.includes("denegar") || a.includes("cancelar") || a.includes("desactivar")) {
    return "bg-red-50 text-red-700 border-red-200";
  }
  if (a.includes("editar") || a.includes("actualizar") || a.includes("modificar") || a.includes("cambiar") || a.includes("asignar")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-slate-50 text-slate-700 border-slate-200";
}

// Sólo se muestran los resultados estandarizados; cualquier otro valor
// (datos históricos de texto libre) se trata como no disponible.
const RESULTADO_STYLES: Record<string, string> = {
  exitoso: "bg-emerald-50 text-emerald-700 border-emerald-200",
  fallido: "bg-red-50 text-red-700 border-red-200",
  denegado: "bg-amber-50 text-amber-700 border-amber-200",
};

function resultadoBadge(resultado: string | null): React.ReactNode {
  const r = (resultado ?? "").toLowerCase();
  const cls = RESULTADO_STYLES[r];
  if (!cls) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <Badge variant="outline" className={`text-xs ${cls}`}>
      {prettify(r)}
    </Badge>
  );
}

export function AuditoriaClient({
  initialData,
  modulos,
  acciones,
  usuarios,
}: AuditoriaClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [selected, setSelected] = useState<RegistroAuditoria | null>(null);
  // Pila de cursores de las páginas previas (para "Anterior").
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  // Estado editable de filtros (sincronizado a la URL al aplicar).
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [moduloFilters, setModuloFilters] = useState<string[]>(
    searchParams.get("modulo")?.split(",").filter(Boolean) ?? [],
  );
  const [accionFilters, setAccionFilters] = useState<string[]>(
    searchParams.get("accion")?.split(",").filter(Boolean) ?? [],
  );
  const [usuarioFilters, setUsuarioFilters] = useState<string[]>(
    searchParams.get("usuario_id")?.split(",").filter(Boolean) ?? [],
  );
  const [resultadoFilters, setResultadoFilters] = useState<string[]>(
    searchParams.get("resultado")?.split(",").filter(Boolean) ?? [],
  );
  const [entidad, setEntidad] = useState(searchParams.get("entidad") ?? "");
  const [desde, setDesde] = useState(searchParams.get("desde") ?? "");
  const [hasta, setHasta] = useState(searchParams.get("hasta") ?? "");
  const [datePreset, setDatePreset] = useState(
    searchParams.get("desde") || searchParams.get("hasta") ? "custom" : "30d",
  );
  const [showMore, setShowMore] = useState(Boolean(searchParams.get("entidad")));

  const pageSize = initialData.page_size;
  const pageIndex = cursorStack.length; // 0-based

  function buildParams(overrides: Record<string, string | null> = {}) {
    const params = new URLSearchParams();
    const set = (key: string, value: string | undefined | null) => {
      if (value) params.set(key, value);
    };
    set("search", search.trim());
    set("modulo", moduloFilters.join(","));
    set("accion", accionFilters.join(","));
    set("usuario_id", usuarioFilters.join(","));
    set("resultado", resultadoFilters.join(","));
    set("entidad", entidad.trim());

    // Rango de fechas según preset.
    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    if (datePreset === "hoy") {
      set("desde", iso(today));
    } else if (datePreset === "7d") {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      set("desde", iso(d));
    } else if (datePreset === "30d") {
      const d = new Date(today);
      d.setDate(d.getDate() - 30);
      set("desde", iso(d));
    } else {
      set("desde", desde);
      set("hasta", hasta);
    }

    for (const [key, value] of Object.entries(overrides)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    return params;
  }

  function applyFilters() {
    setCursorStack([]);
    const params = buildParams({ cursor: null });
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function clearFilters() {
    setSearch("");
    setModuloFilters([]);
    setAccionFilters([]);
    setUsuarioFilters([]);
    setResultadoFilters([]);
    setEntidad("");
    setDesde("");
    setHasta("");
    setDatePreset("30d");
    setShowMore(false);
    setCursorStack([]);
    startTransition(() => router.push(pathname));
  }

  function applyChip(modulosGroup: string[] | null) {
    const next = modulosGroup ?? [];
    setModuloFilters(next);
    setCursorStack([]);
    const params = buildParams({ cursor: null });
    if (next.length) params.set("modulo", next.join(","));
    else params.delete("modulo");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function goNext() {
    if (!initialData.next_cursor) return;
    setCursorStack((prev) => [...prev, searchParams.get("cursor") ?? ""]);
    const params = new URLSearchParams(searchParams.toString());
    params.set("cursor", initialData.next_cursor);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function goPrev() {
    if (cursorStack.length === 0) return;
    const stack = [...cursorStack];
    const target = stack.pop();
    setCursorStack(stack);
    const params = new URLSearchParams(searchParams.toString());
    if (target) params.set("cursor", target);
    else params.delete("cursor");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function changePageSize(value: string) {
    setCursorStack([]);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page_size", value);
    params.delete("cursor");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const activeChip = useMemo(() => {
    const current = [...moduloFilters].sort().join(",");
    for (const chip of CHIP_GROUPS) {
      const group = chip.modulos ? [...chip.modulos].sort().join(",") : "";
      if (current === group) return chip.label;
    }
    return null;
  }, [moduloFilters]);

  const items = initialData.items;
  const page = pageIndex + 1;
  // Keyset: no conocemos el total. Derivamos totalPages para que "Siguiente"
  // se habilite sólo cuando hay más páginas, y total = registros cargados.
  const totalPages = initialData.has_more ? page + 1 : page;
  const totalCargado = pageIndex * pageSize + items.length;

  const usuarioOptions = usuarios.map((u) => ({
    value: u.id,
    label: u.email ? `${u.nombre_completo} (${u.email})` : u.nombre_completo,
  }));

  function getEntidadLabel(log: RegistroAuditoria): string | null {
    const detalle = asRecord(log.detalle);
    const codigo = asText(detalle?.codigo_entidad) || asText(detalle?.codigo);
    const entidadName = log.entidad ? prettify(log.entidad) : null;
    if (codigo) return `${entidadName ?? "Entidad"} · ${codigo}`;
    if (!entidadName) return null;
    if (log.entidad_id) return `${entidadName} #${log.entidad_id.slice(0, 8)}`;
    return entidadName;
  }

  function getUsuarioCell(log: RegistroAuditoria): React.ReactNode {
    if (log.usuario) {
      return (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-700">
            {log.usuario.nombre_completo}
          </p>
          {log.usuario.email && (
            <p className="truncate text-xs text-muted-foreground">
              {log.usuario.email}
            </p>
          )}
        </div>
      );
    }
    if (!log.usuario_id) {
      const sistema = (log.origen ?? "").toUpperCase() === "SISTEMA";
      return (
        <span className="text-xs text-muted-foreground">
          {sistema ? "Proceso automático" : "No disponible"}
        </span>
      );
    }
    return (
      <span className="text-xs text-muted-foreground">
        {log.usuario_id.slice(0, 8)}…
      </span>
    );
  }

  return (
    <div className="space-y-5">
      {/* Chips rápidos */}
      <div className="flex flex-wrap gap-2">
        {CHIP_GROUPS.map((chip) => {
          const active = chip.label === (activeChip ?? "Todos") && (chip.modulos !== null || moduloFilters.length === 0);
          return (
            <button
              key={chip.label}
              type="button"
              onClick={() => applyChip(chip.modulos)}
              disabled={isPending}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Barra de filtros */}
      <FilterBar>
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
          <Filter className="h-4 w-4" />
          Filtros
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <SearchInput
              containerClassName="flex-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por acción, entidad, código o usuario..."
            />
            <Select value={datePreset} onValueChange={setDatePreset}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Rango de fechas" />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {datePreset === "custom" && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-muted-foreground">Desde</label>
                <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-muted-foreground">Hasta</label>
                <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MultiSelectFilter
              placeholder="Todos los módulos"
              options={modulos.map((m) => ({ value: m, label: prettify(m) }))}
              selected={moduloFilters}
              onChange={setModuloFilters}
            />
            <MultiSelectFilter
              placeholder="Todas las acciones"
              options={acciones.map((a) => ({ value: a, label: prettify(a) }))}
              selected={accionFilters}
              onChange={setAccionFilters}
            />
            <MultiSelectFilter
              placeholder="Todos los usuarios"
              options={usuarioOptions}
              selected={usuarioFilters}
              onChange={setUsuarioFilters}
            />
            <MultiSelectFilter
              placeholder="Todos los resultados"
              options={RESULTADO_OPTIONS}
              selected={resultadoFilters}
              onChange={setResultadoFilters}
            />
          </div>

          {showMore && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Entidad</label>
                <Input
                  value={entidad}
                  onChange={(e) => setEntidad(e.target.value)}
                  placeholder="incidente, usuario, alerta..."
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={applyFilters} disabled={isPending}>
              Aplicar filtros
            </Button>
            <Button size="sm" variant="outline" onClick={clearFilters} disabled={isPending}>
              Limpiar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowMore((v) => !v)}
              disabled={isPending}
            >
              <SlidersHorizontal className="mr-1 h-3.5 w-3.5" />
              Más filtros
            </Button>
          </div>
        </div>
      </FilterBar>

      {/* Tabla */}
      <div
        className={`overflow-hidden rounded-lg border bg-white transition-opacity ${
          isPending ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Fecha y hora</TableHead>
              <TableHead>Módulo</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Entidad</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Resultado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <ClipboardList className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    No hay eventos de auditoría que coincidan con los filtros.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              items.map((log) => {
                const entidadLabel = getEntidadLabel(log);
                return (
                  <TableRow
                    key={log.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => setSelected(log)}
                  >
                    <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                      {formatDate(log.fecha_registro)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {prettify(log.modulo)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${accionColor(log.accion)}`}>
                        {prettify(log.accion)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {entidadLabel ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">{getUsuarioCell(log)}</TableCell>
                    <TableCell>{resultadoBadge(log.resultado)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        {items.length > 0 && (
          <TablePaginationBar
            page={page}
            totalPages={totalPages}
            total={totalCargado}
            perPage={pageSize}
            isPending={isPending}
            entityLabel="registros"
            onPrev={goPrev}
            onNext={goNext}
          />
        )}
      </div>

      {/* Selector de tamaño de página */}
      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
        <span>Registros por página</span>
        <Select value={String(pageSize)} onValueChange={changePageSize}>
          <SelectTrigger className="h-7 w-20 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["25", "50", "100"].map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Panel lateral de detalle (solo lectura) */}
      <Drawer
        direction="right"
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DrawerContent className="sm:max-w-xl data-[state=open]:duration-300 data-[state=closed]:duration-200">
          <DrawerHeader className="border-b pb-4">
            <DrawerTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-slate-500" />
              Detalle de auditoría
            </DrawerTitle>
            <DrawerDescription>
              Registro de solo lectura del evento seleccionado.
            </DrawerDescription>
          </DrawerHeader>
          {selected && <AuditoriaDetail log={selected} />}
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
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-start gap-2 border-b border-slate-100 pb-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`wrap-break-word text-xs text-slate-800 ${mono ? "font-mono" : ""}`}>
        {value || "—"}
      </span>
    </div>
  );
}

function AuditoriaDetail({ log }: { log: RegistroAuditoria }) {
  const detalle = asRecord(log.detalle) ?? {};

  // Detección de cambios (before/after en distintos nombres).
  const before =
    asRecord(detalle.before) ?? asRecord(detalle.antes) ?? null;
  const after = asRecord(detalle.after) ?? asRecord(detalle.despues) ?? null;
  const cambios = asRecord(detalle.cambios);

  // Claves estándar ya mostradas en filas dedicadas (excluir del JSON extra).
  const shownKeys = new Set([
    "origen",
    "resultado",
    "before",
    "after",
    "antes",
    "despues",
    "cambios",
    "codigo_entidad",
    "codigo",
  ]);
  const extra = Object.fromEntries(
    Object.entries(detalle).filter(([k]) => !shownKeys.has(k)),
  );
  const codigo = asText(detalle.codigo_entidad) || asText(detalle.codigo);

  return (
    <div className="space-y-4 overflow-y-auto px-4 pb-4 text-sm">
      <div className="space-y-2">
        <DetailRow label="Fecha y hora" value={formatDate(log.fecha_registro)} />
        <DetailRow label="Módulo" value={prettify(log.modulo)} />
        <DetailRow label="Acción" value={prettify(log.accion)} />
        <DetailRow label="Entidad" value={log.entidad ? prettify(log.entidad) : "—"} />
        <DetailRow label="ID de entidad" value={log.entidad_id ?? "—"} mono />
        {codigo && <DetailRow label="Código" value={codigo} />}
        <DetailRow label="Usuario" value={log.usuario?.nombre_completo ?? "No disponible"} />
        <DetailRow label="Correo" value={log.usuario?.email ?? "—"} />
        <DetailRow label="IP de origen" value={log.ip_origen ?? "—"} mono />
        <DetailRow label="Dispositivo" value={log.dispositivo ?? "—"} />
        <DetailRow label="Origen" value={log.origen ?? "—"} />
        <DetailRow label="Resultado" value={resultadoBadge(log.resultado)} />
      </div>

      {(before || after || cambios) && (
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-700">Cambios realizados</p>
          <div className="space-y-1.5 rounded-md border bg-slate-50 p-3">
            {cambios
              ? Object.entries(cambios).map(([k, v]) => (
                  <ChangeRow key={k} field={k} before={undefined} after={v} />
                ))
              : Object.keys({ ...(before ?? {}), ...(after ?? {}) }).map((k) => (
                  <ChangeRow
                    key={k}
                    field={k}
                    before={before?.[k]}
                    after={after?.[k]}
                  />
                ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold text-slate-700">Detalle adicional</p>
        {Object.keys(extra).length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin datos adicionales.</p>
        ) : (
          <pre className="max-h-60 overflow-auto rounded-md border bg-white p-3 text-xs">
            {JSON.stringify(extra, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

function ChangeRow({
  field,
  before,
  after,
}: {
  field: string;
  before: unknown;
  after: unknown;
}) {
  const fmt = (v: unknown) =>
    v === undefined || v === null
      ? "—"
      : typeof v === "object"
        ? JSON.stringify(v)
        : String(v);
  return (
    <div className="grid grid-cols-[100px_1fr] items-start gap-2 text-xs">
      <span className="text-muted-foreground">{prettify(field)}</span>
      <span className="text-slate-800">
        <span className="text-red-600 line-through">{fmt(before)}</span>
        {" → "}
        <span className="text-emerald-700">{fmt(after)}</span>
      </span>
    </div>
  );
}
