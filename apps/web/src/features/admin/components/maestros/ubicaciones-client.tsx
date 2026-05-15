"use client";

import dynamic from "next/dynamic";
import { type FormEvent, type ReactNode, useMemo, useState, useTransition } from "react";
import type { UbicacionMaestra } from "@safecampus/shared-types";
import {
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
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
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
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@safecampus/ui-kit";
import { Edit3, MapPinned, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api/client";

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

type Props = {
  initialItems: UbicacionMaestra[];
};

type FormState = {
  codigo: string;
  nombre: string;
  latitud: string;
  longitud: string;
  activa: boolean;
};

const emptyForm: FormState = {
  codigo: "",
  nombre: "",
  latitud: "",
  longitud: "",
  activa: true,
};

export function UbicacionesClient({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("TODOS");
  const [perPage, setPerPage] = useState("10");
  const [page, setPage] = useState(1);

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
      const matchesEstado =
        estadoFilter === "TODOS" ||
        (estadoFilter === "ACTIVAS" ? item.activa : !item.activa);
      return matchesSearch && matchesEstado;
    });
  }, [items, search, estadoFilter]);

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
        const payload = {
          codigo: form.codigo.trim(),
          nombre: form.nombre.trim(),
          latitud: lat,
          longitud: lng,
          activa: form.activa,
        };

        if (editing) {
          const updated = await api.patch<UbicacionMaestra>(`/maestros/ubicaciones/${editing.id}`, payload);
          setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
          toast.success("Ubicacion actualizada.");
        } else {
          const created = await api.post<UbicacionMaestra>("/maestros/ubicaciones", payload);
          setItems((current) => [created, ...current]);
          toast.success("Ubicacion creada.");
        }

        setDrawerOpen(false);
        setEditing(null);
        setForm(emptyForm);
        resetPaging();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar la ubicacion.");
      }
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      try {
        await api.delete<void>(`/maestros/ubicaciones/${deleteTarget.id}`);
        setItems((current) => current.filter((item) => item.id !== deleteTarget.id));
        toast.success("Ubicacion eliminada.");
        setDeleteTarget(null);
        resetPaging();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo eliminar la ubicacion.");
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
          <p className="text-sm text-slate-500">Catalogo transversal de ubicaciones para formularios del sistema.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refresh} disabled={isPending}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva ubicacion
          </Button>
        </div>
      </div>

      <section className="rounded-lg border bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_200px_160px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar por codigo o nombre"
            />
          </div>

          <Select
            value={estadoFilter}
            onValueChange={(value) => {
              setEstadoFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos los estados</SelectItem>
              <SelectItem value="ACTIVAS">Activas</SelectItem>
              <SelectItem value="INACTIVAS">Inactivas</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={perPage}
            onValueChange={(value) => {
              setPerPage(value);
              setPage(1);
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 filas</SelectItem>
              <SelectItem value="20">20 filas</SelectItem>
              <SelectItem value="50">50 filas</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={resetPaging}>
            <MapPinned className="mr-2 h-4 w-4" />
            Reiniciar pagina
          </Button>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Codigo</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Latitud</TableHead>
              <TableHead>Longitud</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-sm text-slate-500">
                  No hay ubicaciones para los filtros seleccionados.
                </TableCell>
              </TableRow>
            ) : (
              pagedItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.codigo}</TableCell>
                  <TableCell>{item.nombre}</TableCell>
                  <TableCell>{item.latitud}</TableCell>
                  <TableCell>{item.longitud}</TableCell>
                  <TableCell>
                    <Badge variant={item.activa ? "default" : "secondary"}>
                      {item.activa ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-rose-600" onClick={() => setDeleteTarget(item)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
        <DrawerContent className="h-full overflow-hidden p-0 sm:max-w-xl">
          <form onSubmit={saveItem} className="flex min-h-full flex-col">
            <DrawerHeader className="border-b px-6 py-5 text-left">
              <DrawerTitle>{editing ? "Editar ubicacion" : "Nueva ubicacion"}</DrawerTitle>
              <DrawerDescription>
                Define codigo, nombre y coordenadas para reutilizar en formularios del sistema.
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex-1 space-y-4 px-6 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Codigo">
                  <Input
                    value={form.codigo}
                    onChange={(event) => setForm((current) => ({ ...current, codigo: event.target.value.toUpperCase() }))}
                    placeholder="EJ: PABELLON_A"
                    required
                  />
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
                  Abrir mapa en modal
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
              <Button type="submit" disabled={isPending}>{editing ? "Guardar cambios" : "Registrar ubicacion"}</Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar ubicacion</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion eliminara la ubicacion {deleteTarget?.nombre ?? "seleccionada"}. Asegurate de que no se use en procesos activos.
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
              Guardar coordenadas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={mapConfirmOpen} onOpenChange={setMapConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar coordenadas</AlertDialogTitle>
            <AlertDialogDescription>
              Se aplicaran las coordenadas seleccionadas al formulario de ubicacion. ¿Deseas continuar?
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
