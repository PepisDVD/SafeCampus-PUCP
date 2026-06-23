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
import { Archive, Clock, Layers, PackageSearch, Plus, Settings, ShieldCheck, Trash2, type LucideIcon } from "lucide-react";
import { lostFoundClient } from "../client";
import type { CategoriaLf, CategoriaLfWritePayload, MetadatoCampoLf, MetadatoTipoLf } from "../types";

const TABS = [
  { value: "categorias", label: "Categorías", icon: Layers },
  { value: "matching", label: "Matching", icon: Settings },
  { value: "ciclo-vida", label: "Ciclo de vida", icon: Clock },
  { value: "custodia", label: "Custodia", icon: ShieldCheck },
] as const;

type TabValue = (typeof TABS)[number]["value"];
const VALID_TABS = new Set<string>(TABS.map((t) => t.value));
const DEFAULT_TAB: TabValue = "categorias";

type SortValue = "nombre_asc" | "nombre_desc" | "orden_visual";

type Props = {
  categorias: CategoriaLf[];
};

export function LostFoundAdmin({ categorias }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
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
        <TabsContent value="matching">
          <Placeholder
            icon={Settings}
            title="Matching"
            description="Configuracion del motor de matching deterministico (umbral y pesos). Disponible en una proxima fase."
          />
        </TabsContent>
        <TabsContent value="ciclo-vida">
          <Placeholder
            icon={Clock}
            title="Ciclo de vida"
            description="Transiciones de estado y motivos de cierre del caso. Disponible en una proxima fase."
          />
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
              <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción breve de la categoría" />
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
