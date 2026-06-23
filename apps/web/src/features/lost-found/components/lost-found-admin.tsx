"use client";

import type { ReactNode } from "react";
import { FormEvent, useState, useTransition } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Input,
  Label,
  Switch,
  Textarea,
} from "@safecampus/ui-kit";
import { Activity, AlertTriangle, Archive, CheckCircle2, Edit3, PackageSearch, Plus, Settings, TrendingUp, type LucideIcon } from "lucide-react";
import { toast } from "@safecampus/ui-kit";
import { lostFoundClient } from "../client";
import type { CategoriaLf, KpisLf } from "../types";

type Props = {
  categorias: CategoriaLf[];
  kpis: KpisLf;
  configuracion: Array<{ key: string; value: Record<string, unknown>; descripcion?: string | null }>;
};

const emptyCategory: Omit<CategoriaLf, "id"> = {
  nombre: "",
  descripcion: "",
  icono: "PackageSearch",
  activa: true,
  es_perecible: false,
  metadatos_schema: {},
};

export function LostFoundAdmin({ categorias: initialCategorias, kpis, configuracion }: Props) {
  const [categorias, setCategorias] = useState(initialCategorias);
  const [editing, setEditing] = useState<CategoriaLf | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [umbral, setUmbral] = useState(String((configuracion.find((c) => c.key === "matching")?.value.umbral as number | undefined) ?? 0.55));
  const [isPending, startTransition] = useTransition();

  const saveThreshold = () => {
    startTransition(async () => {
      await lostFoundClient.actualizarConfig("matching", {
        value: { umbral: Number(umbral) },
        descripcion: "Configuracion del motor de matching deterministico",
      });
      toast.success("Configuracion actualizada");
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Configuracion Lost & Found</h1>
          <p className="text-sm text-slate-500">Parametros operativos, categorias y salud del modulo.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva categoria
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Metric title="Total" value={kpis.total_casos} tone="blue" icon={Activity} />
        <Metric title="Abiertos" value={kpis.abiertos} tone={kpis.abiertos > 20 ? "amber" : "green"} icon={PackageSearch} />
        <Metric title="Cerrados" value={kpis.cerrados} tone="green" icon={CheckCircle2} />
        <Metric title="Por vencer" value={kpis.custodias_por_vencer} tone={kpis.custodias_por_vencer > 0 ? "red" : "green"} icon={AlertTriangle} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Catalogo de categorias</CardTitle>
            <Badge variant="secondary">{categorias.length} categorias</Badge>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {categorias.map((categoria) => (
              <button key={categoria.id} onClick={() => openEdit(categoria)} className="rounded-lg border bg-white p-3 text-left transition hover:border-[#001C55]/40 hover:bg-slate-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-950">{categoria.nombre}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{categoria.descripcion || "Sin descripcion"}</p>
                  </div>
                  <Edit3 className="h-4 w-4 shrink-0 text-slate-400" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant={categoria.activa ? "default" : "secondary"}>{categoria.activa ? "Activa" : "Inactiva"}</Badge>
                  {categoria.es_perecible && <Badge variant="outline">Perecible</Badge>}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />Matching</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Label>Umbral de sugerencia</Label>
              <Input type="number" step="0.05" min="0" max="1" value={umbral} onChange={(e) => setUmbral(e.target.value)} />
              <Button variant="outline" className="w-full" onClick={saveThreshold} disabled={isPending}>Guardar</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Recuperacion</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-950">{kpis.tasa_recuperacion}%</p>
              <p className="mt-1 text-sm text-slate-500">Casos devueltos sobre el total registrado.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <CategoryDrawer
        open={drawerOpen}
        categoria={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={(categoria) => {
          setCategorias((items) => {
            const exists = items.some((item) => item.id === categoria.id);
            const next = exists ? items.map((item) => item.id === categoria.id ? categoria : item) : [...items, categoria];
            return next.sort((a, b) => a.nombre.localeCompare(b.nombre));
          });
          setDrawerOpen(false);
        }}
      />
    </div>
  );
}

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
  const [isPending, startTransition] = useTransition();
  const initial = categoria ?? emptyCategory;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      nombre: String(form.get("nombre")).trim(),
      descripcion: optional(form.get("descripcion")),
      icono: "PackageSearch",
      activa: form.get("activa") === "on",
      es_perecible: form.get("es_perecible") === "on",
      metadatos_schema: {},
    };
    if (!payload.nombre) return;
    startTransition(async () => {
      try {
        const saved = categoria
          ? await lostFoundClient.actualizarCategoria(categoria.id, payload)
          : await lostFoundClient.crearCategoria(payload);
        toast.success(categoria ? "Categoria actualizada" : "Categoria creada");
        onSaved(saved);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar la categoria");
      }
    });
  };

  return (
    <Drawer open={open} onOpenChange={(next) => !next && onClose()} direction="right">
      <DrawerContent className="h-full overflow-hidden p-0 sm:max-w-xl">
        <form onSubmit={submit} className="flex min-h-full flex-col">
          <DrawerHeader className="border-b px-6 py-5 text-left">
            <DrawerTitle>{categoria ? "Editar categoria" : "Nueva categoria"}</DrawerTitle>
            <DrawerDescription>Define clasificacion, vigencia y tratamiento operativo.</DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 space-y-4 px-6 py-5">
            <Field label="Nombre">
              <Input name="nombre" defaultValue={initial.nombre} placeholder="Ej. Electronicos" required />
            </Field>
            <Field label="Descripcion">
              <Textarea name="descripcion" defaultValue={initial.descripcion ?? ""} placeholder="Descripcion breve de la categoria" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <ToggleField label="Activa" name="activa" defaultChecked={initial.activa} />
              <ToggleField label="Perecible" name="es_perecible" defaultChecked={initial.es_perecible} />
            </div>
          </div>
          <DrawerFooter className="mt-auto border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              <Archive className="mr-2 h-4 w-4" />
              Guardar
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}

const toneClass = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  red: "border-rose-200 bg-rose-50 text-rose-700",
  blue: "border-sky-200 bg-sky-50 text-sky-700",
};

function Metric({ title, value, tone, icon: Icon }: { title: string; value: number; tone: keyof typeof toneClass; icon: LucideIcon }) {
  return (
    <Card className={toneClass[tone]}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-lg bg-white/70 p-2"><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function ToggleField({ label, name, defaultChecked }: { label: string; name: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm font-medium">{label}</span>
      <Switch name={name} defaultChecked={defaultChecked} />
    </label>
  );
}

function optional(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || undefined;
}
