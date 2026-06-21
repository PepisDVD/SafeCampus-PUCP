"use client";

import dynamic from "next/dynamic";
import { type FormEvent, type ReactNode, useMemo, useState, useTransition } from "react";
import type { TipoUbicacion, UbicacionMaestra } from "@safecampus/shared-types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  cn,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  FilterBar,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  MultiSelectFilter,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SearchInput,
  StatusBadge,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@safecampus/ui-kit";
import { Ban, List, Map as MapIcon, MoreHorizontal, Pencil, Plus, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api/client";
import {
  TIPO_UBICACION_OPTIONS,
  formatTipoUbicacion,
} from "@/features/admin/constants/ubicacion-tipos";

const LeafletCoordinatePicker = dynamic(
  () => import("@/features/admin/components/maestros/leaflet-coordinate-picker").then((mod) => mod.LeafletCoordinatePicker),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-lg border bg-slate-50 text-sm text-slate-500">
        Cargando mapa...
      </div>
    ),
  },
);

const LeafletLocationsMap = dynamic(
  () => import("@/features/admin/components/maestros/leaflet-locations-map").then((mod) => mod.LeafletLocationsMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[78vh] min-h-130 items-center justify-center bg-slate-50 text-sm text-slate-500">
        Cargando mapa...
      </div>
    ),
  },
);

type ViewMode = "list" | "map";

type Props = {
  initialItems: UbicacionMaestra[];
};

type FormState = {
  codigo: string;
  nombre: string;
  tipo: TipoUbicacion;
  latitud: string;
  longitud: string;
  activa: boolean;
};

const emptyForm: FormState = {
  codigo: "",
  nombre: "",
  tipo: "OTRO",
  latitud: "",
  longitud: "",
  activa: true,
};

export function UbicacionesClient({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [view, setView] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [estadoFilters, setEstadoFilters] = useState<string[]>([]);
  const [tipoFilters, setTipoFilters] = useState<string[]>([]);
  const [perPage, setPerPage] = useState("10");
  const [page, setPage] = useState(1);
  // Ubicación resaltada al seleccionar una fila; se centra al pasar al mapa.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<UbicacionMaestra | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [deleteTarget, setDeleteTarget] = useState<UbicacionMaestra | null>(null);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [mapConfirmOpen, setMapConfirmOpen] = useState(false);
  const [mapDraft, setMapDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [isPending, startTransition] = useTransition();
  const latValue = toNumberOrNull(form.latitud);
  const lngValue = toNumberOrNull(form.longitud);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !term ||
        item.codigo.toLowerCase().includes(term) ||
        item.nombre.toLowerCase().includes(term);
      const itemEstado = item.activa ? "ACTIVAS" : "INACTIVAS";
      const matchesEstado =
        estadoFilters.length === 0 || estadoFilters.includes(itemEstado);
      const matchesTipo =
        tipoFilters.length === 0 || tipoFilters.includes(item.tipo);
      return matchesSearch && matchesEstado && matchesTipo;
    });
  }, [items, search, estadoFilters, tipoFilters]);

  const rowsPerPage = Number(perPage);
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / rowsPerPage));
  const pagedItems = filteredItems.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDrawerOpen(true);
  };

  const openEdit = (target: UbicacionMaestra) => {
    setEditing(target);
    setForm({
      codigo: target.codigo,
      nombre: target.nombre,
      tipo: target.tipo,
      latitud: String(target.latitud),
      longitud: String(target.longitud),
      activa: target.activa,
    });
    setDrawerOpen(true);
  };

  const resetPaging = () => {
    setPage(1);
  };

  const refresh = () => {
    startTransition(async () => {
      try {
        const latest = await api.get<UbicacionMaestra[]>("/maestros/ubicaciones", {
          params: { include_inactive: "true" },
        });
        setItems(latest);
        resetPaging();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo actualizar la tabla.");
      }
    });
  };

  const saveItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const lat = Number(form.latitud);
    const lng = Number(form.longitud);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      toast.error("Latitud y longitud deben ser valores numericos.");
      return;
    }

    startTransition(async () => {
      try {
        if (editing) {
          // El código es inmutable tras el registro: no se envía al actualizar.
          const updated = await api.patch<UbicacionMaestra>(`/maestros/ubicaciones/${editing.id}`, {
            nombre: form.nombre.trim(),
            tipo: form.tipo,
            latitud: lat,
            longitud: lng,
            activa: form.activa,
          });
          setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
          toast.success("Ubicación actualizada.");
        } else {
          const created = await api.post<UbicacionMaestra>("/maestros/ubicaciones", {
            codigo: form.codigo.trim(),
            nombre: form.nombre.trim(),
            tipo: form.tipo,
            latitud: lat,
            longitud: lng,
            activa: form.activa,
          });
          setItems((current) => [created, ...current]);
          toast.success("Ubicación creada.");
        }

        setDrawerOpen(false);
        setEditing(null);
        setForm(emptyForm);
        resetPaging();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar la ubicación.");
      }
    });
  };

  const toggleActiva = (target: UbicacionMaestra) => {
    const nextActiva = !target.activa;
    startTransition(async () => {
      try {
        const updated = await api.patch<UbicacionMaestra>(`/maestros/ubicaciones/${target.id}`, {
          nombre: target.nombre,
          tipo: target.tipo,
          latitud: target.latitud,
          longitud: target.longitud,
          activa: nextActiva,
        });
        setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        toast.success(nextActiva ? "Ubicación reactivada." : "Ubicación desactivada.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo actualizar el estado.");
      }
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      try {
        await api.delete<void>(`/maestros/ubicaciones/${deleteTarget.id}`);
        setItems((current) => current.filter((item) => item.id !== deleteTarget.id));
        toast.success("Ubicación eliminada.");
        setDeleteTarget(null);
        resetPaging();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo eliminar la ubicación.");
      }
    });
  };

  const openMapDialog = () => {
    setMapDraft({
      lat: latValue ?? -12.06945,
      lng: lngValue ?? -77.08055,
    });
    setMapDialogOpen(true);
  };

  const applyMapCoordinates = () => {
    if (!mapDraft) {
      setMapConfirmOpen(false);
      return;
    }
    setForm((current) => ({
      ...current,
      latitud: mapDraft.lat.toFixed(6),
      longitud: mapDraft.lng.toFixed(6),
    }));
    setMapConfirmOpen(false);
    setMapDialogOpen(false);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Maestros · Ubicaciones</h1>
          <p className="text-sm text-slate-500">Catálogo transversal de ubicaciones para formularios del sistema.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refresh} disabled={isPending}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva ubicación
          </Button>
        </div>
      </div>

      <FilterBar>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_200px_220px]">
            <SearchInput
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar por código o nombre"
            />

            <MultiSelectFilter
              placeholder="Todos los estados"
              options={[
                { value: "ACTIVAS", label: "Activas" },
                { value: "INACTIVAS", label: "Inactivas" },
              ]}
              selected={estadoFilters}
              onChange={(value) => {
                setEstadoFilters(value);
                setPage(1);
              }}
            />

            <MultiSelectFilter
              placeholder="Todos los tipos"
              options={TIPO_UBICACION_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              selected={tipoFilters}
              onChange={(value) => {
                setTipoFilters(value);
                setPage(1);
              }}
              selectedLabel={(count) => `${count} tipos`}
            />
          </div>

          <div className="flex items-center gap-3">
            {view === "list" && (
              <Select
                value={perPage}
                onValueChange={(value) => {
                  setPerPage(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 filas</SelectItem>
                  <SelectItem value="20">20 filas</SelectItem>
                  <SelectItem value="50">50 filas</SelectItem>
                </SelectContent>
              </Select>
            )}

            <ViewToggle view={view} onChange={setView} />
          </div>
        </div>
      </FilterBar>

      {view === "list" ? (
      <section className="overflow-hidden rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-sm text-slate-500">
                  No hay ubicaciones para los filtros seleccionados.
                </TableCell>
              </TableRow>
            ) : (
              pagedItems.map((item) => (
                <TableRow
                  key={item.id}
                  onClick={() =>
                    setSelectedId((current) => (current === item.id ? null : item.id))
                  }
                  data-state={selectedId === item.id ? "selected" : undefined}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium">{item.codigo}</TableCell>
                  <TableCell>{item.nombre}</TableCell>
                  <TableCell>
                    <StatusBadge tone="info">{formatTipoUbicacion(item.tipo)}</StatusBadge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={item.activa ? "success" : "neutral"}>
                      {item.activa ? "Activa" : "Inactiva"}
                    </StatusBadge>
                  </TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Acciones para ${item.nombre}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onSelect={() => openEdit(item)}>
                          <Pencil />
                          Editar
                        </DropdownMenuItem>
                        {item.activa ? (
                          <DropdownMenuItem onSelect={() => toggleActiva(item)}>
                            <Ban />
                            Desactivar
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onSelect={() => toggleActiva(item)}>
                            <RotateCcw />
                            Reactivar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {item.tiene_relaciones ? (
                          <DropdownMenuItem
                            disabled
                            className="text-muted-foreground"
                            title="Asociada a otras entidades; desactívala en su lugar."
                          >
                            <Trash2 />
                            Eliminar (bloqueado)
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setDeleteTarget(item)}
                          >
                            <Trash2 />
                            Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-slate-500">
          <span>{filteredItems.length} registros · pagina {page} de {totalPages}</span>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  className={page <= 1 || isPending ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  onClick={(event) => {
                    event.preventDefault();
                    if (page > 1 && !isPending) setPage((current) => current - 1);
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  className={page >= totalPages || isPending ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  onClick={(event) => {
                    event.preventDefault();
                    if (page < totalPages && !isPending) setPage((current) => current + 1);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </section>
      ) : (
      <section className="overflow-hidden rounded-lg border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <p className="text-sm font-medium text-slate-700">
            {filteredItems.length}{" "}
            {filteredItems.length === 1 ? "ubicación visible" : "ubicaciones visibles"}
          </p>
        </div>
        <LeafletLocationsMap
          items={filteredItems}
          selectedId={selectedId}
          onEdit={openEdit}
        />
      </section>
      )}

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
        <DrawerContent className="h-full overflow-hidden p-0 sm:max-w-xl">
          <form onSubmit={saveItem} className="flex min-h-full flex-col">
            <DrawerHeader className="border-b px-6 py-5 text-left">
              <DrawerTitle>{editing ? "Editar ubicación" : "Nueva ubicación"}</DrawerTitle>
              <DrawerDescription>
                Define codigo, nombre y coordenadas para reutilizar en formularios del sistema.
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex-1 space-y-4 px-6 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Código">
                  <Input
                    value={form.codigo}
                    onChange={(event) => setForm((current) => ({ ...current, codigo: event.target.value.toUpperCase() }))}
                    placeholder="EJ: PABELLON_A"
                    required
                    // El código se fija en el registro inicial y no puede cambiarse.
                    disabled={Boolean(editing)}
                  />
                  {editing && (
                    <p className="text-xs text-slate-500">
                    </p>
                  )}
                </Field>
                <Field label="Nombre">
                  <Input
                    value={form.nombre}
                    onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
                    placeholder="Ej. Pabellon A"
                    required
                  />
                </Field>
              </div>

              <Field label="Tipo de ubicación">
                <Select
                  value={form.tipo}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, tipo: value as TipoUbicacion }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_UBICACION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Latitud">
                  <Input
                    type="number"
                    step="0.000001"
                    min={-90}
                    max={90}
                    value={form.latitud}
                    onChange={(event) => setForm((current) => ({ ...current, latitud: event.target.value }))}
                    required
                  />
                </Field>
                <Field label="Longitud">
                  <Input
                    type="number"
                    step="0.000001"
                    min={-180}
                    max={180}
                    value={form.longitud}
                    onChange={(event) => setForm((current) => ({ ...current, longitud: event.target.value }))}
                    required
                  />
                </Field>
              </div>

              <Field label="Mapa de coordenadas">
                <Button type="button" variant="outline" onClick={openMapDialog}>
                  Seleccionar en mapa
                </Button>
              </Field>

              <label className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">Activa</span>
                <Switch
                  checked={form.activa}
                  onCheckedChange={(checked) => setForm((current) => ({ ...current, activa: checked }))}
                />
              </label>
            </div>

            <DrawerFooter className="mt-auto border-t px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>{editing ? "Guardar cambios" : "Registrar ubicación"}</Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar ubicación</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la ubicación {deleteTarget?.nombre ?? "seleccionada"}. Asegúrate de que no se use en procesos activos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isPending} className="bg-rose-600 hover:bg-rose-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Seleccionar coordenadas en mapa</DialogTitle>
            <DialogDescription>
              Navega y haz clic en el punto exacto. Luego guarda para aplicar latitud y longitud en el formulario.
            </DialogDescription>
          </DialogHeader>

          <LeafletCoordinatePicker
            lat={mapDraft?.lat ?? null}
            lng={mapDraft?.lng ?? null}
            mapClassName="h-[58vh]"
            showHelperText={false}
            onChange={(lat, lng) => setMapDraft({ lat, lng })}
          />

          <p className="text-xs text-slate-500">
            Coordenada seleccionada: {mapDraft?.lat.toFixed(6) ?? "-"}, {mapDraft?.lng.toFixed(6) ?? "-"}
          </p>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setMapDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => setMapConfirmOpen(true)}>
              Aplicar coordenadas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={mapConfirmOpen} onOpenChange={setMapConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar coordenadas</AlertDialogTitle>
            <AlertDialogDescription>
              Se aplicarán las coordenadas seleccionadas al formulario de ubicación. ¿Deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={applyMapCoordinates}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Selector compacto Lista / Mapa para alternar la vista del catálogo. */
function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}) {
  const options: { value: ViewMode; label: string; icon: typeof List }[] = [
    { value: "list", label: "Lista", icon: List },
    { value: "map", label: "Mapa", icon: MapIcon },
  ];

  return (
    <div
      role="tablist"
      aria-label="Vista del catálogo"
      className="inline-flex shrink-0 rounded-lg border bg-white p-0.5"
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = view === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition",
              active
                ? "bg-[#001C55] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100",
            )}
          >
            <Icon className="h-4 w-4" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function toNumberOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}
