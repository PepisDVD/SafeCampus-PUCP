"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  Card,
  CardContent,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  FilterBar,
  Input,
  Label,
  MultiSelectFilter,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  StatusBadge,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePaginationBar,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@safecampus/ui-kit";
import { Archive, Ban, Layers, PackageSearch, Pencil, Plus, RotateCcw, Settings, ShieldCheck, Trash2, type LucideIcon } from "lucide-react";
import { lostFoundClient } from "../client";
import type { CategoriaLf, CategoriaLfWritePayload, CustodiaPoliticaLf, MatchingConfigLf, MetadatoCampoLf, MetadatoTipoLf, MotivoCierreLf, MotivoCierreLfWritePayload } from "../types";

const TABS = [
  { value: "categorias", label: "Categorías", icon: Layers },
  { value: "reglas-operativas", label: "Reglas operativas", icon: Settings },
  { value: "custodia", label: "Custodia", icon: ShieldCheck },
] as const;

type TabValue = (typeof TABS)[number]["value"];
const VALID_TABS = new Set<string>(TABS.map((t) => t.value));
const DEFAULT_TAB: TabValue = "categorias";

type SortValue = "nombre_asc" | "nombre_desc" | "orden_visual";
type MotivoSortValue = "nombre_asc" | "nombre_desc" | "orden_visual";
const MOTIVOS_PER_PAGE = 8;

type Props = {
  categorias: CategoriaLf[];
  matchingConfig: MatchingConfigLf;
  politicaCustodia: CustodiaPoliticaLf;
  motivosCierre: MotivoCierreLf[];
};

function TooltipSubtitle({
  title,
  description,
  prominent = false,
}: {
  title: string;
  description: string;
  prominent?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <h2
          tabIndex={0}
          className={`${prominent ? "text-base" : "text-sm"} w-fit cursor-help font-semibold text-slate-950 underline decoration-dotted decoration-slate-300 underline-offset-4 outline-none transition-colors hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2`}
        >
          {title}
        </h2>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-xs leading-relaxed">
        {description}
      </TooltipContent>
    </Tooltip>
  );
}

export function LostFoundAdmin({ categorias, matchingConfig, politicaCustodia, motivosCierre }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const rawTab = requestedTab === "matching" || requestedTab === "ciclo-vida" ? "reglas-operativas" : requestedTab;
  const tab: TabValue = VALID_TABS.has(rawTab ?? "") ? (rawTab as TabValue) : DEFAULT_TAB;

  const setTab = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Configuración Lost & Found</h1>
        <p className="text-sm text-slate-500">Catálogo de categorías, metadatos y parámetros del módulo.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="gap-6">
        <TabsList className="h-auto flex-wrap">
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="gap-1.5">
              <Icon className="h-4 w-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="categorias">
          <CategoriasTab categorias={categorias} />
        </TabsContent>
        <TabsContent value="reglas-operativas">
          <ReglasOperativasTab config={matchingConfig} politica={politicaCustodia} motivos={motivosCierre} />
        </TabsContent>
        <TabsContent value="custodia">
          <Placeholder
            icon={ShieldCheck}
            title="Custodia"
            description="Plazos de custodia, vencimientos y reglas de descarte. Disponible en una proxima fase."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ───────────────────────────── Categorías ─────────────────────────────

function CategoriasTab({ categorias: initial }: { categorias: CategoriaLf[] }) {
  const [categorias, setCategorias] = useState(initial);
  const [editing, setEditing] = useState<CategoriaLf | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [estadoFilters, setEstadoFilters] = useState<string[]>([]);
  const [sort, setSort] = useState<SortValue>("nombre_asc");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const visibles = useMemo(() => {
    const term = search.trim().toLowerCase();
    return categorias
      .filter((c) => {
        const matchesSearch = !term || c.nombre.toLowerCase().includes(term) || c.codigo.toLowerCase().includes(term);
        const estado = c.activa ? "activa" : "inactiva";
        const matchesEstado = estadoFilters.length === 0 || estadoFilters.includes(estado);
        return matchesSearch && matchesEstado;
      })
      .sort((a, b) => {
        if (sort === "orden_visual") return a.orden_visual - b.orden_visual || a.nombre.localeCompare(b.nombre);
        return sort === "nombre_asc" ? a.nombre.localeCompare(b.nombre) : b.nombre.localeCompare(a.nombre);
      });
  }, [categorias, search, estadoFilters, sort]);

  const upsertLocal = (categoria: CategoriaLf) => {
    setCategorias((items) => {
      const exists = items.some((item) => item.id === categoria.id);
      return exists ? items.map((item) => (item.id === categoria.id ? categoria : item)) : [...items, categoria];
    });
  };

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (categoria: CategoriaLf) => {
    setEditing(categoria);
    setDrawerOpen(true);
  };

  const toggleActiva = (categoria: CategoriaLf) => {
    setPendingId(categoria.id);
    startTransition(async () => {
      try {
        const saved = await lostFoundClient.actualizarCategoria(categoria.id, toWritePayload({ ...categoria, activa: !categoria.activa }));
        upsertLocal(saved);
        toast.success(saved.activa ? "Categoría reactivada" : "Categoría desactivada");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo actualizar la categoría");
      } finally {
        setPendingId(null);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">Catálogo de categorías</h2>
          <p className="text-sm text-slate-500">{categorias.length} categorías registradas. No se permite eliminación física.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva categoría
        </Button>
      </div>

      <FilterBar className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          containerClassName="flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o código de categoría..."
        />
        <MultiSelectFilter
          className="w-full sm:w-44"
          placeholder="Todos los estados"
          options={[
            { value: "activa", label: "Activas" },
            { value: "inactiva", label: "Inactivas" },
          ]}
          selected={estadoFilters}
          onChange={setEstadoFilters}
        />
        <Select value={sort} onValueChange={(value) => setSort(value as SortValue)}>
          <SelectTrigger className="w-full sm:w-48" aria-label="Ordenar categorias">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nombre_asc">Nombre (A → Z)</SelectItem>
            <SelectItem value="nombre_desc">Nombre (Z → A)</SelectItem>
            <SelectItem value="orden_visual">Orden visual</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {categorias.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">
          Aún no hay categorías. Crea la primera con &ldquo;Nueva categoría&rdquo;.
        </p>
      ) : visibles.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">
          No se encontraron categorías con los filtros aplicados.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((categoria) => {
            const metadatosActivos = (categoria.metadatos_schema?.campos ?? []).filter((c) => c.activo).length;
            return (
              <Card key={categoria.id} className={categoria.activa ? "" : "opacity-70"}>
                <CardContent className="space-y-3 p-4">
                  <button type="button" onClick={() => openEdit(categoria)} className="block w-full text-left">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-950">{categoria.nombre}</p>
                        <p className="font-mono text-xs text-slate-400">{categoria.codigo}</p>
                      </div>
                      <PackageSearch className="h-4 w-4 shrink-0 text-slate-400" />
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-500">{categoria.descripcion || "Sin descripción"}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusBadge tone={categoria.activa ? "success" : "neutral"}>{categoria.activa ? "Activa" : "Inactiva"}</StatusBadge>
                      {categoria.es_perecible && <Badge variant="outline">Perecible</Badge>}
                      <Badge variant="outline">{metadatosActivos} metadatos</Badge>
                    </div>
                  </button>
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" disabled={isPending} onClick={() => toggleActiva(categoria)}>
                      {pendingId === categoria.id && <Spinner className="mr-1 h-4 w-4" />}
                      {categoria.activa ? "Desactivar" : "Reactivar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CategoryDrawer
        key={editing?.id ?? "nueva"}
        open={drawerOpen}
        categoria={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={(categoria) => {
          upsertLocal(categoria);
          setDrawerOpen(false);
        }}
      />
    </div>
  );
}

// ───────────────────────────── Reglas operativas ─────────────────────────────

function ReglasOperativasTab({
  config,
  politica,
  motivos,
}: {
  config: MatchingConfigLf;
  politica: CustodiaPoliticaLf;
  motivos: MotivoCierreLf[];
}) {
  return (
    <div className="space-y-6">
      <TooltipSubtitle
        title="Reglas operativas"
        description="Configura el matching, los plazos del ciclo de vida y los motivos habilitados para cerrar casos."
        prominent
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <MatchingTab config={config} />
        <PoliticaCicloVida politica={politica} />
      </div>
      <MotivosCierre motivos={motivos} />
    </div>
  );
}

// ───────────────────────────── Matching ─────────────────────────────

function MatchingTab({ config }: { config: MatchingConfigLf }) {
  const [umbral, setUmbral] = useState(String(config.umbral));
  const [saved, setSaved] = useState(config.umbral);
  const [isPending, startTransition] = useTransition();

  const value = Number(umbral);
  const invalid = umbral.trim() === "" || Number.isNaN(value) || value < 0 || value > 1;
  const dirty = !invalid && Number(value.toFixed(4)) !== Number(saved.toFixed(4));

  const submit = () => {
    if (invalid) {
      toast.error("El umbral debe ser un número entre 0.00 y 1.00.");
      return;
    }
    startTransition(async () => {
      try {
        const result = await lostFoundClient.actualizarMatchingConfig(Number(value.toFixed(4)));
        setSaved(result.umbral);
        setUmbral(String(result.umbral));
        toast.success("Umbral de sugerencia actualizado.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar el umbral.");
      }
    });
  };

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-5 p-5">
        <TooltipSubtitle
          title="Matching"
          description="Define cuándo se sugiere una coincidencia entre casos perdidos y encontrados."
        />

        <div className="space-y-2">
          <Label htmlFor="umbral-matching">Umbral de sugerencia</Label>
          <Input
            id="umbral-matching"
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={umbral}
            onChange={(e) => setUmbral(e.target.value)}
            aria-invalid={invalid}
            className="w-32"
          />
          <p className="text-xs text-slate-500">
            Un valor alto exige mayor similitud antes de sugerir una coincidencia. Rango permitido: 0.00 a 1.00.
          </p>
          {invalid && <p className="text-xs text-rose-600">Ingresa un valor entre 0.00 y 1.00.</p>}
        </div>

        <Button type="button" className="mt-auto w-fit" onClick={submit} disabled={isPending || invalid || !dirty}>
          {isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
          Guardar cambios
        </Button>
      </CardContent>
    </Card>
  );
}

// ───────────────────────────── Ciclo de vida ─────────────────────────────

type PoliticaForm = Omit<CustodiaPoliticaLf, "version">;

const POLITICA_LIMITS = {
  dias_maximos_custodia: { min: 1, max: 365 },
  dias_alerta_vencimiento: { min: 0, max: 90 },
  dias_recordatorio_previo: { min: 0, max: 90 },
  horas_maximas_perecibles: { min: 1, max: 168 },
  horas_alerta_perecible: { min: 0, max: 72 },
} as const satisfies Record<keyof PoliticaForm, { min: number; max: number }>;

function validarPolitica(p: PoliticaForm): string | null {
  const vals = Object.values(p);
  if (vals.some((v) => Number.isNaN(v))) return "Completa todos los campos con números válidos.";
  const limites = POLITICA_LIMITS;
  if (p.dias_maximos_custodia < limites.dias_maximos_custodia.min || p.dias_maximos_custodia > limites.dias_maximos_custodia.max) return `Los días máximos de custodia deben estar entre ${limites.dias_maximos_custodia.min} y ${limites.dias_maximos_custodia.max}.`;
  if (p.dias_alerta_vencimiento < limites.dias_alerta_vencimiento.min || p.dias_alerta_vencimiento > limites.dias_alerta_vencimiento.max) return `La alerta de vencimiento debe estar entre ${limites.dias_alerta_vencimiento.min} y ${limites.dias_alerta_vencimiento.max} días.`;
  if (p.dias_recordatorio_previo < limites.dias_recordatorio_previo.min || p.dias_recordatorio_previo > limites.dias_recordatorio_previo.max) return `El recordatorio previo debe estar entre ${limites.dias_recordatorio_previo.min} y ${limites.dias_recordatorio_previo.max} días.`;
  if (p.dias_alerta_vencimiento >= p.dias_maximos_custodia) return "Los días para marcar 'Por vencer' deben ser menores a los días máximos.";
  if (p.dias_recordatorio_previo >= p.dias_maximos_custodia) return "Los días previos de recordatorio deben ser menores a los días máximos.";
  if (p.horas_maximas_perecibles < limites.horas_maximas_perecibles.min || p.horas_maximas_perecibles > limites.horas_maximas_perecibles.max) return `Las horas máximas para perecibles deben estar entre ${limites.horas_maximas_perecibles.min} y ${limites.horas_maximas_perecibles.max}.`;
  if (p.horas_alerta_perecible < limites.horas_alerta_perecible.min || p.horas_alerta_perecible > limites.horas_alerta_perecible.max) return `La alerta de perecibles debe estar entre ${limites.horas_alerta_perecible.min} y ${limites.horas_alerta_perecible.max} horas.`;
  if (p.horas_alerta_perecible >= p.horas_maximas_perecibles) return "Las horas de alerta deben ser menores a las horas máximas de perecibles.";
  return null;
}

function PoliticaCicloVida({ politica }: { politica: CustodiaPoliticaLf }) {
  const toForm = (p: CustodiaPoliticaLf): Record<keyof PoliticaForm, string> => ({
    dias_maximos_custodia: String(p.dias_maximos_custodia),
    dias_alerta_vencimiento: String(p.dias_alerta_vencimiento),
    dias_recordatorio_previo: String(p.dias_recordatorio_previo),
    horas_maximas_perecibles: String(p.horas_maximas_perecibles),
    horas_alerta_perecible: String(p.horas_alerta_perecible),
  });

  const [form, setForm] = useState(() => toForm(politica));
  const [saved, setSaved] = useState<PoliticaForm>(politica);
  const [isPending, startTransition] = useTransition();

  const set = (key: keyof PoliticaForm, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const nums: PoliticaForm = {
    dias_maximos_custodia: Number(form.dias_maximos_custodia),
    dias_alerta_vencimiento: Number(form.dias_alerta_vencimiento),
    dias_recordatorio_previo: Number(form.dias_recordatorio_previo),
    horas_maximas_perecibles: Number(form.horas_maximas_perecibles),
    horas_alerta_perecible: Number(form.horas_alerta_perecible),
  };
  const error = validarPolitica(nums);
  const dirty = (Object.keys(nums) as (keyof PoliticaForm)[]).some((k) => nums[k] !== saved[k]);

  const submit = () => {
    if (error) {
      toast.error(error);
      return;
    }
    startTransition(async () => {
      try {
        const result = await lostFoundClient.actualizarPoliticaCustodia(nums);
        setSaved(result);
        setForm(toForm(result));
        toast.success("Política de custodia actualizada.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo guardar la política.");
      }
    });
  };

  return (
    <Card className="h-full">
      <CardContent className="space-y-5 p-5">
        <TooltipSubtitle
          title="Política de custodia"
          description="Plazos de vencimiento y recordatorios. No afecta custodias ya registradas."
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Días máximos de custodia" value={form.dias_maximos_custodia} {...POLITICA_LIMITS.dias_maximos_custodia} onChange={(v) => set("dias_maximos_custodia", v)} />
          <NumberField label="Días para marcar “Por vencer”" value={form.dias_alerta_vencimiento} {...POLITICA_LIMITS.dias_alerta_vencimiento} onChange={(v) => set("dias_alerta_vencimiento", v)} />
          <NumberField label="Días previos para recordatorio" value={form.dias_recordatorio_previo} {...POLITICA_LIMITS.dias_recordatorio_previo} onChange={(v) => set("dias_recordatorio_previo", v)} />
        </div>

        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Objetos perecibles</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField label="Horas máximas de custodia" value={form.horas_maximas_perecibles} {...POLITICA_LIMITS.horas_maximas_perecibles} onChange={(v) => set("horas_maximas_perecibles", v)} />
            <NumberField label="Horas previas para alerta" value={form.horas_alerta_perecible} {...POLITICA_LIMITS.horas_alerta_perecible} onChange={(v) => set("horas_alerta_perecible", v)} />
          </div>
        </div>

        {error && <p className="text-xs text-rose-600">{error}</p>}

        <Button type="button" onClick={submit} disabled={isPending || !!error || !dirty}>
          {isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
          Guardar cambios
        </Button>
      </CardContent>
    </Card>
  );
}

function NumberField({ label, value, onChange, min, max }: { label: string; value: string; onChange: (value: string) => void; min: number; max: number }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type="number" min={min} max={max} value={value} onChange={(e) => onChange(e.target.value)} className="w-full" />
      <p className="text-[11px] text-slate-400">Rango permitido: {min}–{max}</p>
    </div>
  );
}

function MotivosCierre({ motivos: initial }: { motivos: MotivoCierreLf[] }) {
  const [motivos, setMotivos] = useState(initial);
  const [editing, setEditing] = useState<MotivoCierreLf | null>(null);
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState<MotivoSortValue>("nombre_asc");
  const [page, setPage] = useState(1);
  const [pending, startTransition] = useTransition();
  const motivosOrdenados = useMemo(
    () => [...motivos].sort((a, b) => {
      if (sort === "orden_visual") return a.orden_visual - b.orden_visual || a.nombre.localeCompare(b.nombre);
      return sort === "nombre_asc" ? a.nombre.localeCompare(b.nombre) : b.nombre.localeCompare(a.nombre);
    }),
    [motivos, sort],
  );
  const totalPages = Math.max(1, Math.ceil(motivosOrdenados.length / MOTIVOS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginados = useMemo(
    () => motivosOrdenados.slice((currentPage - 1) * MOTIVOS_PER_PAGE, currentPage * MOTIVOS_PER_PAGE),
    [motivosOrdenados, currentPage],
  );
  const upsert = (saved: MotivoCierreLf) => setMotivos((items) => items.some((x) => x.id === saved.id) ? items.map((x) => x.id === saved.id ? saved : x) : [...items, saved]);
  const toggle = (motivo: MotivoCierreLf) => startTransition(async () => {
    try {
      const saved = await lostFoundClient.actualizarMotivoCierre(motivo.id, motivoPayload({ ...motivo, activo: !motivo.activo }));
      upsert(saved);
      toast.success(saved.activo ? "Motivo reactivado" : "Motivo desactivado");
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo actualizar el motivo"); }
  });
  return <Card><CardContent className="space-y-4 p-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <TooltipSubtitle
        title="Motivos de cierre"
        description="Catálogo controlado para nuevos cierres. Los motivos usados solo pueden desactivarse."
      />
      <div className="flex flex-wrap items-center gap-2">
        <Select value={sort} onValueChange={(value) => { setSort(value as MotivoSortValue); setPage(1); }}>
          <SelectTrigger className="w-48" aria-label="Ordenar motivos de cierre"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="nombre_asc">Nombre (A → Z)</SelectItem>
            <SelectItem value="nombre_desc">Nombre (Z → A)</SelectItem>
            <SelectItem value="orden_visual">Orden visual</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Nuevo motivo</Button>
      </div>
    </div>
    <div className="rounded-lg border"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Nombre</TableHead><TableHead>Clase</TableHead><TableHead>Requiere observación</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>
      {paginados.length === 0 ? <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-slate-500">Aún no hay motivos de cierre.</TableCell></TableRow> : paginados.map((m) => <TableRow key={m.id} className={m.activo ? "" : "opacity-60"}><TableCell className="font-mono text-xs">{m.codigo}</TableCell><TableCell>{m.nombre}</TableCell><TableCell><Badge variant="outline">{m.clase_cierre}</Badge></TableCell><TableCell>{m.requiere_observacion ? "Sí" : "No"}</TableCell><TableCell><StatusBadge tone={m.activo ? "success" : "neutral"}>{m.activo ? "Activo" : "Inactivo"}</StatusBadge></TableCell><TableCell><div className="flex justify-end gap-1">
        <Tooltip><TooltipTrigger asChild><Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={`Editar ${m.nombre}`} onClick={() => { setEditing(m); setOpen(true); }}><Pencil className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>
        <Tooltip><TooltipTrigger asChild><Button type="button" size="icon" variant="ghost" className={m.activo ? "h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700" : "h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"} aria-label={`${m.activo ? "Desactivar" : "Reactivar"} ${m.nombre}`} disabled={pending} onClick={() => toggle(m)}>{m.activo ? <Ban className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}</Button></TooltipTrigger><TooltipContent>{m.activo ? "Desactivar" : "Reactivar"}</TooltipContent></Tooltip>
      </div></TableCell></TableRow>)}
    </TableBody></Table></div>
      {motivosOrdenados.length > 0 && (
        <TablePaginationBar
          page={currentPage}
          totalPages={totalPages}
          total={motivosOrdenados.length}
          perPage={MOTIVOS_PER_PAGE}
          isPending={pending}
          entityLabel="motivos"
          onPrev={() => setPage(Math.max(1, currentPage - 1))}
          onNext={() => setPage(Math.min(totalPages, currentPage + 1))}
        />
      )}
    </div>
    <MotivoCierreDrawer key={editing?.id ?? "nuevo-motivo"} open={open} motivo={editing} onClose={() => setOpen(false)} onSaved={(saved) => { upsert(saved); setOpen(false); }} />
  </CardContent></Card>;
}

type MotivoFormErrors = Partial<Record<"codigo" | "nombre" | "descripcion" | "orden", string>>;

function validateMotivoForm(codigo: string, nombre: string, descripcion: string, orden: number): MotivoFormErrors {
  const errors: MotivoFormErrors = {};
  const codigoLimpio = codigo.trim();
  const nombreLimpio = nombre.trim();
  if (codigoLimpio.length < 2 || codigoLimpio.length > 80) errors.codigo = "Debe tener entre 2 y 80 caracteres.";
  else if (!/^[A-Z][A-Z0-9_]*$/.test(codigoLimpio)) errors.codigo = "Usa mayúsculas, números y guiones bajos; debe iniciar con una letra.";
  if (nombreLimpio.length < 2 || nombreLimpio.length > 120) errors.nombre = "Debe tener entre 2 y 120 caracteres.";
  if (descripcion.trim().length > 1000) errors.descripcion = "No puede superar los 1000 caracteres.";
  if (!Number.isInteger(orden) || orden < 0 || orden > 9999) errors.orden = "Debe ser un entero entre 0 y 9999.";
  return errors;
}

function MotivoCierreDrawer({ open, motivo, onClose, onSaved }: { open: boolean; motivo: MotivoCierreLf | null; onClose: () => void; onSaved: (value: MotivoCierreLf) => void }) {
  const [codigo, setCodigo] = useState(motivo?.codigo ?? "");
  const [nombre, setNombre] = useState(motivo?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(motivo?.descripcion ?? "");
  const [clase, setClase] = useState<MotivoCierreLf["clase_cierre"]>(motivo?.clase_cierre ?? "ADMINISTRATIVO");
  const [observacion, setObservacion] = useState(motivo?.requiere_observacion ?? false);
  const [validacion, setValidacion] = useState(motivo?.requiere_validacion_entrega ?? false);
  const [orden, setOrden] = useState(motivo?.orden_visual ?? 0);
  const [errors, setErrors] = useState<MotivoFormErrors>({});
  const [pending, startTransition] = useTransition();

  const clearError = (field: keyof MotivoFormErrors) => setErrors((current) => ({ ...current, [field]: undefined }));
  const submit = () => {
    const nextErrors = validateMotivoForm(codigo, nombre, descripcion, orden);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Revisa los campos marcados antes de guardar.");
      return;
    }
    const body: MotivoCierreLfWritePayload = {
      codigo: codigo.trim(),
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      clase_cierre: clase,
      requiere_observacion: observacion,
      requiere_validacion_entrega: clase === "DEVOLUCION" && validacion,
      activo: motivo?.activo ?? true,
      orden_visual: orden,
    };
    startTransition(async () => {
      try {
        const saved = motivo
          ? await lostFoundClient.actualizarMotivoCierre(motivo.id, body)
          : await lostFoundClient.crearMotivoCierre(body);
        onSaved(saved);
        toast.success(motivo ? "Motivo actualizado" : "Motivo creado");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar el motivo");
      }
    });
  };

  return (
    <Drawer open={open} onOpenChange={(next) => !next && onClose()} direction="right">
      <DrawerContent className="h-full p-0 sm:max-w-lg">
        <div className="flex min-h-full flex-col">
          <DrawerHeader className="border-b px-6 py-5 text-left">
            <DrawerTitle>{motivo ? "Editar motivo" : "Nuevo motivo"}</DrawerTitle>
            <DrawerDescription>Configura las validaciones aplicables al cierre.</DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <Field label="Código">
              <Input
                value={codigo}
                maxLength={80}
                disabled={Boolean(motivo)}
                aria-invalid={Boolean(errors.codigo)}
                onChange={(e) => { setCodigo(e.target.value.toUpperCase()); clearError("codigo"); }}
              />
            </Field>
            {errors.codigo && <FormFieldError>{errors.codigo}</FormFieldError>}
            {motivo && <p className="text-xs text-slate-500">El código queda bloqueado después de crear el motivo.</p>}
            <Field label="Nombre">
              <Input value={nombre} maxLength={120} aria-invalid={Boolean(errors.nombre)} onChange={(e) => { setNombre(e.target.value); clearError("nombre"); }} />
            </Field>
            {errors.nombre && <FormFieldError>{errors.nombre}</FormFieldError>}
            <Field label="Descripción">
              <Textarea
                value={descripcion}
                rows={4}
                maxLength={1000}
                className="min-h-28 resize-y"
                aria-invalid={Boolean(errors.descripcion)}
                onChange={(e) => { setDescripcion(e.target.value); clearError("descripcion"); }}
              />
            </Field>
            <div className="flex justify-between text-[11px] text-slate-400"><span className={errors.descripcion ? "text-rose-600" : undefined}>{errors.descripcion ?? "Campo opcional"}</span><span>{descripcion.length}/1000</span></div>
            <Field label="Clase">
              <Select value={clase} onValueChange={(value) => { setClase(value as MotivoCierreLf["clase_cierre"]); if (value !== "DEVOLUCION") setValidacion(false); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="DEVOLUCION">Devolución</SelectItem><SelectItem value="DESCARTE">Descarte</SelectItem><SelectItem value="ADMINISTRATIVO">Administrativo</SelectItem></SelectContent>
              </Select>
            </Field>
            <ToggleField label="Requiere observación" checked={observacion} onCheckedChange={setObservacion} />
            {clase === "DEVOLUCION" && <ToggleField label="Requiere validación de entrega" checked={validacion} onCheckedChange={setValidacion} />}
            <Field label="Orden visual">
              <Input type="number" min={0} max={9999} step={1} value={orden} aria-invalid={Boolean(errors.orden)} onChange={(e) => { setOrden(Number(e.target.value)); clearError("orden"); }} />
            </Field>
            {errors.orden && <FormFieldError>{errors.orden}</FormFieldError>}
          </div>
          <DrawerFooter className="border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="button" disabled={pending} onClick={submit}>{pending && <Spinner className="mr-2 h-4 w-4" />}Guardar</Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function FormFieldError({ children }: { children: ReactNode }) {
  return <p className="text-xs text-rose-600">{children}</p>;
}

function motivoPayload(m: MotivoCierreLf): MotivoCierreLfWritePayload { return { codigo: m.codigo, nombre: m.nombre, descripcion: m.descripcion ?? null, clase_cierre: m.clase_cierre, requiere_observacion: m.requiere_observacion, requiere_validacion_entrega: m.requiere_validacion_entrega, activo: m.activo, orden_visual: m.orden_visual }; }

// ───────────────────────────── Drawer ─────────────────────────────

type FieldState = {
  uid: string;
  codigo: string;
  persisted: boolean;
  etiqueta: string;
  tipo: MetadatoTipoLf;
  requerido: boolean;
  participa: boolean;
  orden: number;
  activo: boolean;
};

function CategoryDrawer({
  open,
  categoria,
  onClose,
  onSaved,
}: {
  open: boolean;
  categoria: CategoriaLf | null;
  onClose: () => void;
  onSaved: (categoria: CategoriaLf) => void;
}) {
  const isEdit = Boolean(categoria);
  const [isPending, startTransition] = useTransition();

  const [codigo, setCodigo] = useState(categoria?.codigo ?? "");
  const [nombre, setNombre] = useState(categoria?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(categoria?.descripcion ?? "");
  const [orden, setOrden] = useState<number>(categoria?.orden_visual ?? 0);
  const [activa, setActiva] = useState(categoria?.activa ?? true);
  const [esPerecible, setEsPerecible] = useState(categoria?.es_perecible ?? false);

  const [fields, setFields] = useState<FieldState[]>(() => buildFields(categoria));
  const [openItems, setOpenItems] = useState<string[]>([]);

  const updateField = (uid: string, patch: Partial<FieldState>) =>
    setFields((prev) => prev.map((f) => (f.uid === uid ? { ...f, ...patch } : f)));

  const removeField = (uid: string) => {
    setFields((prev) => prev.filter((f) => f.uid !== uid));
    setOpenItems((prev) => prev.filter((id) => id !== uid));
  };

  const addField = () => {
    const uid = crypto.randomUUID();
    setFields((prev) => [
      ...prev,
      { uid, codigo: "", persisted: false, etiqueta: "", tipo: "texto", requerido: false, participa: false, orden: prev.length + 1, activo: true },
    ]);
    setOpenItems((prev) => [...prev, uid]);
  };

  const submit = () => {
    if (!nombre.trim()) {
      toast.error("El nombre de la categoría es obligatorio.");
      return;
    }
    const sinNombre = fields.find((f) => !f.etiqueta.trim());
    if (sinNombre) {
      toast.error("Cada metadato necesita un nombre de campo.");
      setOpenItems((prev) => (prev.includes(sinNombre.uid) ? prev : [...prev, sinNombre.uid]));
      return;
    }

    const campos: MetadatoCampoLf[] = fields.map((f, index) => ({
      codigo: f.persisted && f.codigo ? f.codigo : slugCodigo(f.etiqueta),
      etiqueta: f.etiqueta.trim(),
      tipo: f.tipo,
      requerido: f.requerido,
      participa_en_matching: f.tipo === "texto" && f.participa,
      orden: f.orden || index + 1,
      activo: f.activo,
    }));

    const payload: CategoriaLfWritePayload = {
      codigo: codigo.trim() || undefined,
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      icono: categoria?.icono ?? "PackageSearch",
      activa,
      es_perecible: esPerecible,
      orden_visual: Number(orden) || 0,
      metadatos_schema: { version: 1, campos },
    };

    startTransition(async () => {
      try {
        const saved = categoria
          ? await lostFoundClient.actualizarCategoria(categoria.id, payload)
          : await lostFoundClient.crearCategoria(payload);
        toast.success(categoria ? "Categoría actualizada" : "Categoría creada");
        onSaved(saved);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar la categoría");
      }
    });
  };

  return (
    <Drawer open={open} onOpenChange={(next) => !next && onClose()} direction="right">
      <DrawerContent className="h-full overflow-hidden p-0 sm:max-w-2xl">
        <div className="flex min-h-full flex-col">
          <DrawerHeader className="border-b px-6 py-5 text-left">
            <DrawerTitle>{isEdit ? "Editar categoría" : "Nueva categoría"}</DrawerTitle>
            <DrawerDescription>Define clasificación, vigencia y metadatos del objeto.</DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Código">
                <Input
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="Se genera del nombre"
                  readOnly={isEdit}
                  className={isEdit ? "bg-slate-50 text-slate-500" : undefined}
                  aria-readonly={isEdit}
                />
              </Field>
              <Field label="Orden visual">
                <Input type="number" min="0" value={String(orden)} onChange={(e) => setOrden(Number(e.target.value) || 0)} />
              </Field>
            </div>
            <Field label="Nombre">
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Electrónicos" required />
            </Field>
            <Field label="Descripción">
              <Textarea
                value={descripcion}
                rows={4}
                maxLength={1000}
                className="min-h-28 resize-y"
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción breve de la categoría"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <ToggleField label="Activa" checked={activa} onCheckedChange={setActiva} />
              <ToggleField label="Es perecible" checked={esPerecible} onCheckedChange={setEsPerecible} />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h3 className="w-fit cursor-help text-sm font-semibold text-slate-950 underline decoration-dotted decoration-slate-300 underline-offset-4">
                      Metadatos del objeto
                    </h3>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Campos específicos de esta categoría. Despliega cada uno para gestionarlo.
                  </TooltipContent>
                </Tooltip>
                <Button type="button" size="sm" variant="outline" onClick={addField}>
                  <Plus className="mr-1 h-4 w-4" />
                  Agregar
                </Button>
              </div>

              {fields.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-center text-xs text-slate-500">
                  Sin metadatos. Agrega el primero con &ldquo;Agregar&rdquo;.
                </p>
              ) : (
                <Accordion type="multiple" value={openItems} onValueChange={setOpenItems} className="rounded-lg border">
                  {fields.map((field) => (
                    <MetadatoAccordionItem
                      key={field.uid}
                      field={field}
                      onChange={(patch) => updateField(field.uid, patch)}
                      onRemove={() => removeField(field.uid)}
                    />
                  ))}
                </Accordion>
              )}
            </div>
          </div>

          <DrawerFooter className="mt-auto border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
            <Button type="button" onClick={submit} disabled={isPending}>
              {isPending ? <Spinner className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function MetadatoAccordionItem({
  field,
  onChange,
  onRemove,
}: {
  field: FieldState;
  onChange: (patch: Partial<FieldState>) => void;
  onRemove: () => void;
}) {
  const codigoPreview = field.persisted && field.codigo ? field.codigo : slugCodigo(field.etiqueta);
  return (
    <AccordionItem value={field.uid} className="px-3">
      <AccordionTrigger className="hover:no-underline">
        <span className="flex min-w-0 flex-1 items-center justify-between gap-2 pr-2">
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-slate-900">{field.etiqueta || "Nuevo metadato"}</span>
            <span className="font-mono text-xs text-slate-400">{codigoPreview} · {field.tipo}</span>
          </span>
          <StatusBadge tone={field.activo ? "success" : "neutral"}>{field.activo ? "Activo" : "Inactivo"}</StatusBadge>
        </span>
      </AccordionTrigger>
      <AccordionContent className="space-y-3 px-1">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre del campo">
            <Input value={field.etiqueta} onChange={(e) => onChange({ etiqueta: e.target.value })} placeholder="Ej. Número de serie" />
          </Field>
          <Field label="Tipo">
            <Select
              value={field.tipo}
              onValueChange={(value) => onChange({ tipo: value as MetadatoTipoLf, participa: value === "texto" ? field.participa : false })}
            >
              <SelectTrigger aria-label="Tipo de metadato">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="texto">Texto</SelectItem>
                <SelectItem value="numero">Número</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-2 rounded-lg border p-2.5 text-xs">
            <span className="font-medium text-slate-600">Obligatorio</span>
            <Switch checked={field.requerido} onCheckedChange={(checked) => onChange({ requerido: checked })} />
          </label>
          <label className={`flex flex-col gap-2 rounded-lg border p-2.5 text-xs ${field.tipo === "texto" ? "" : "opacity-50"}`}>
            <span className="font-medium text-slate-600">Matching</span>
            <Switch
              checked={field.tipo === "texto" && field.participa}
              disabled={field.tipo !== "texto"}
              onCheckedChange={(checked) => onChange({ participa: checked })}
            />
          </label>
          <label className="flex flex-col gap-2 rounded-lg border p-2.5 text-xs">
            <span className="font-medium text-slate-600">Orden</span>
            <Input
              type="number"
              min="0"
              value={String(field.orden)}
              onChange={(e) => onChange({ orden: Number(e.target.value) || 0 })}
              className="h-7 w-full"
            />
          </label>
        </div>

        <div className="flex items-center justify-between gap-2 border-t pt-3">
          <label className="flex items-center gap-2 text-xs font-medium">
            <Switch checked={field.activo} onCheckedChange={(checked) => onChange({ activo: checked })} />
            <span>{field.activo ? "Activo" : "Inactivo"}</span>
          </label>
          {!field.persisted && (
            <Button type="button" size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={onRemove}>
              <Trash2 className="mr-1 h-4 w-4" />
              Quitar
            </Button>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

// ───────────────────────────── Helpers ─────────────────────────────

function Placeholder({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
        <div className="rounded-full bg-slate-100 p-3 text-slate-400">
          <Icon className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="max-w-sm text-sm text-slate-500">{description}</p>
        <Badge variant="outline" className="mt-1">Proximamente</Badge>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function ToggleField({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

function buildFields(categoria: CategoriaLf | null): FieldState[] {
  return (categoria?.metadatos_schema?.campos ?? [])
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .map((c) => ({
      uid: c.codigo,
      codigo: c.codigo,
      persisted: true,
      etiqueta: c.etiqueta,
      tipo: c.tipo,
      requerido: c.requerido,
      participa: c.participa_en_matching,
      orden: c.orden,
      activo: c.activo,
    }));
}

function toWritePayload(categoria: CategoriaLf): CategoriaLfWritePayload {
  return {
    codigo: categoria.codigo,
    nombre: categoria.nombre,
    descripcion: categoria.descripcion ?? null,
    icono: categoria.icono ?? "PackageSearch",
    activa: categoria.activa,
    es_perecible: categoria.es_perecible,
    orden_visual: categoria.orden_visual,
    metadatos_schema: categoria.metadatos_schema ?? { version: 1, campos: [] },
  };
}

const DIACRITICS = /[̀-ͯ]/g;

function slugCodigo(value: string): string {
  const base = value.normalize("NFKD").replace(DIACRITICS, "");
  const slug = base.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return slug || "CAMPO";
}
