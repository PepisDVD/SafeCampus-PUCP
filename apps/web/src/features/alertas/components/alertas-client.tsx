"use client";

import { type FormEvent, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Megaphone,
  Plus,
  Send,
  ShieldAlert,
  SquarePen,
  XCircle,
} from "lucide-react";
import {
  CanalNotificacion,
  EstadoAlertaCampus,
  NivelSeveridad,
  OrigenAlerta,
  TipoSegmentoAlerta,
  type AlertaDetail,
  type AlertaListItem,
  type AlertaListResponse,
  type AlertaSegmentoInput,
  type UbicacionMaestra,
} from "@safecampus/shared-types";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Input,
  Label,
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
  TableRow,
  Textarea,
  cn,
} from "@safecampus/ui-kit";
import { toast } from "sonner";

import {
  actualizarAlerta,
  cancelarAlerta,
  crearAlerta,
  finalizarAlerta,
  obtenerAlertaCliente,
  publicarAlerta,
} from "@/features/alertas/client";
import {
  ALERTA_ESTADO_STYLE,
  ALERTA_SEVERIDAD_DOT,
  ALERTA_SEVERIDAD_LABEL,
  CANAL_NOTIFICACION_LABEL,
  ENTREGA_ESTADO_STYLE,
  SEGMENTO_ALERTA_LABEL,
  formatDateTime,
} from "@/features/alertas/presentation";

type Props = {
  initialData: AlertaListResponse;
  ubicaciones: UbicacionMaestra[];
};

type FormState = {
  titulo: string;
  contenido: string;
  severidad: NivelSeveridad;
  canales: CanalNotificacion[];
  zona_id: string;
  latitud: string;
  longitud: string;
  radio_metros: string;
  roles: string;
  departamentos: string;
};

const EMPTY_FORM: FormState = {
  titulo: "",
  contenido: "",
  severidad: NivelSeveridad.MEDIO,
  canales: [CanalNotificacion.INAPP],
  zona_id: "NONE",
  latitud: "",
  longitud: "",
  radio_metros: "250",
  roles: "comunidad",
  departamentos: "",
};

const CANALES = [
  CanalNotificacion.INAPP,
  CanalNotificacion.WHATSAPP,
  CanalNotificacion.EMAIL,
  CanalNotificacion.PUSH,
  CanalNotificacion.SMS,
];

const SEVERIDADES = [
  NivelSeveridad.BAJO,
  NivelSeveridad.MEDIO,
  NivelSeveridad.ALTO,
  NivelSeveridad.CRITICO,
];

function splitValues(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toNumberOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function AlertasClient({ initialData, ubicaciones }: Props) {
  const [items, setItems] = useState(initialData.items);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("TODOS");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<AlertaDetail | null>(null);
  const [editing, setEditing] = useState<AlertaListItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !term ||
        item.codigo.toLowerCase().includes(term) ||
        item.titulo.toLowerCase().includes(term);
      const matchesEstado = estado === "TODOS" || item.estado === estado;
      return matchesSearch && matchesEstado;
    });
  }, [items, search, estado]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  };

  const openEdit = (item: AlertaListItem) => {
    setEditing(item);
    setForm({
      titulo: item.titulo,
      contenido: item.contenido,
      severidad: item.severidad,
      canales: item.canales,
      zona_id: item.zona_id ?? "NONE",
      latitud: item.latitud === null ? "" : String(item.latitud),
      longitud: item.longitud === null ? "" : String(item.longitud),
      radio_metros: item.radio_metros === null ? "" : String(item.radio_metros),
      roles: "",
      departamentos: "",
    });
    setDrawerOpen(true);
  };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const latitud = toNumberOrNull(form.latitud);
    const longitud = toNumberOrNull(form.longitud);
    const radio = toNumberOrNull(form.radio_metros);
    const segmentos: AlertaSegmentoInput[] = [
      ...splitValues(form.roles).map((rol) => ({
        tipo: TipoSegmentoAlerta.ROL,
        valor: rol,
      })),
      ...splitValues(form.departamentos).map((departamento) => ({
        tipo: TipoSegmentoAlerta.DEPARTAMENTO,
        valor: departamento,
      })),
    ];
    if (form.zona_id !== "NONE") {
      const zona = ubicaciones.find((item) => item.id === form.zona_id);
      segmentos.push({
        tipo: TipoSegmentoAlerta.ZONA,
        valor: zona?.nombre ?? form.zona_id,
        ubicacion_id: form.zona_id,
        radio_metros: radio,
      });
    }
    startTransition(async () => {
      try {
        const payload = {
          tipo: "ALR-MAS-SEG",
          familia: "A",
          titulo: form.titulo,
          contenido: form.contenido,
          severidad: form.severidad,
          origen: OrigenAlerta.MANUAL,
          canales: form.canales,
          zona_id: form.zona_id === "NONE" ? null : form.zona_id,
          latitud,
          longitud,
          radio_metros: radio,
          segmentos,
        };
        const saved = editing
          ? await actualizarAlerta(editing.id, payload)
          : await crearAlerta(payload);
        setItems((current) => {
          const exists = current.some((item) => item.id === saved.id);
          return exists
            ? current.map((item) => (item.id === saved.id ? saved : item))
            : [saved, ...current];
        });
        toast.success(editing ? "Alerta actualizada." : "Alerta creada.");
        setDrawerOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar la alerta.");
      }
    });
  };

  const runAction = (item: AlertaListItem, action: "publicar" | "cancelar" | "finalizar") => {
    startTransition(async () => {
      try {
        const result =
          action === "publicar"
            ? (await publicarAlerta(item.id)).alerta
            : action === "cancelar"
              ? await cancelarAlerta(item.id, { comentario: "Cancelada desde consola operativa." })
              : await finalizarAlerta(item.id, { comentario: "Finalizada desde consola operativa." });
        setItems((current) => current.map((row) => (row.id === result.id ? result : row)));
        toast.success("Accion registrada.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo ejecutar la accion.");
      }
    });
  };

  const openDetail = (item: AlertaListItem) => {
    startTransition(async () => {
      try {
        const detail = await obtenerAlertaCliente(item.id);
        setSelected(detail);
        setDetailOpen(true);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo cargar el detalle.");
      }
    });
  };

  const toggleCanal = (canal: CanalNotificacion, checked: boolean) => {
    setForm((current) => {
      const canales = checked
        ? Array.from(new Set([...current.canales, canal]))
        : current.canales.filter((item) => item !== canal);
      return { ...current, canales: canales.length ? canales : [CanalNotificacion.INAPP] };
    });
  };

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Alertas de campus</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestiona contenido, audiencia, zonas y publicacion multicanal.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/alertas/reportes">Reportes</Link>
          </Button>
          <Button onClick={openCreate} className="gap-2 bg-[#001C55] hover:bg-[#032E84]">
            <Plus className="h-4 w-4" />
            Nueva alerta
          </Button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric title="Total" value={items.length} icon={Megaphone} />
        <Metric
          title="Activas"
          value={items.filter((item) => item.estado === EstadoAlertaCampus.ACTIVA).length}
          icon={ShieldAlert}
        />
        <Metric
          title="Fallidas"
          value={items.reduce((total, item) => total + item.entregas_fallidas, 0)}
          icon={AlertTriangle}
        />
      </section>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Consola operativa</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar codigo o titulo"
              className="w-64"
            />
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                {Object.values(EstadoAlertaCampus).map((item) => (
                  <SelectItem key={item} value={item}>
                    {ALERTA_ESTADO_STYLE[item].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alerta</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Zona</TableHead>
                <TableHead>Canales</TableHead>
                <TableHead>Entregas</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-sm text-slate-500">
                    No hay alertas para los filtros seleccionados.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-mono text-xs text-slate-500">{item.codigo}</p>
                      <p className="font-semibold text-slate-950">{item.titulo}</p>
                      <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500">
                        <span className={cn("h-2 w-2 rounded-full", ALERTA_SEVERIDAD_DOT[item.severidad])} />
                        {ALERTA_SEVERIDAD_LABEL[item.severidad]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("border-0", ALERTA_ESTADO_STYLE[item.estado].className)}>
                        {ALERTA_ESTADO_STYLE[item.estado].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {item.zona_nombre ?? "Sin zona"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.canales.map((canal) => (
                          <Badge key={canal} variant="secondary">
                            {CANAL_NOTIFICACION_LABEL[canal]}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-medium text-emerald-700">{item.entregas_enviadas}</span>
                      <span className="text-slate-400"> / {item.entregas_total}</span>
                      {item.entregas_fallidas > 0 && (
                        <span className="ml-2 text-red-600">{item.entregas_fallidas} fallidas</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openDetail(item)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(item)} disabled={isPending}>
                          <SquarePen className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => runAction(item, "publicar")} disabled={isPending}>
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => runAction(item, "finalizar")} disabled={isPending}>
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-red-600" onClick={() => runAction(item, "cancelar")} disabled={isPending}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
        <DrawerContent className="h-full overflow-y-auto p-0 sm:max-w-2xl">
          <form onSubmit={save} className="flex min-h-full flex-col">
            <DrawerHeader className="border-b px-6 py-5 text-left">
              <DrawerTitle>{editing ? "Editar alerta" : "Nueva alerta"}</DrawerTitle>
              <DrawerDescription>
                Define contenido, zona, audiencia y canales de comunicacion.
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 space-y-5 px-6 py-5">
              <Field label="Titulo">
                <Input value={form.titulo} onChange={(event) => setForm((current) => ({ ...current, titulo: event.target.value }))} required />
              </Field>
              <Field label="Contenido">
                <Textarea value={form.contenido} onChange={(event) => setForm((current) => ({ ...current, contenido: event.target.value }))} rows={5} required />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Severidad">
                  <Select value={form.severidad} onValueChange={(value) => setForm((current) => ({ ...current, severidad: value as NivelSeveridad }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SEVERIDADES.map((item) => (
                        <SelectItem key={item} value={item}>{ALERTA_SEVERIDAD_LABEL[item]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Zona">
                  <Select value={form.zona_id} onValueChange={(value) => setForm((current) => ({ ...current, zona_id: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Sin zona especifica</SelectItem>
                      {ubicaciones.map((item) => (
                        <SelectItem key={item.id} value={item.id}>{item.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Latitud">
                  <Input value={form.latitud} onChange={(event) => setForm((current) => ({ ...current, latitud: event.target.value }))} placeholder="-12.06945" />
                </Field>
                <Field label="Longitud">
                  <Input value={form.longitud} onChange={(event) => setForm((current) => ({ ...current, longitud: event.target.value }))} placeholder="-77.08055" />
                </Field>
                <Field label="Radio (m)">
                  <Input value={form.radio_metros} onChange={(event) => setForm((current) => ({ ...current, radio_metros: event.target.value }))} />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Roles">
                  <Input value={form.roles} onChange={(event) => setForm((current) => ({ ...current, roles: event.target.value }))} placeholder="comunidad, operador" />
                </Field>
                <Field label="Departamentos">
                  <Input value={form.departamentos} onChange={(event) => setForm((current) => ({ ...current, departamentos: event.target.value }))} placeholder="Estudios Generales" />
                </Field>
              </div>
              <Field label="Canales">
                <div className="grid gap-2 sm:grid-cols-2">
                  {CANALES.map((canal) => (
                    <label key={canal} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                      <Checkbox
                        checked={form.canales.includes(canal)}
                        onCheckedChange={(checked) => toggleCanal(canal, checked === true)}
                      />
                      {CANAL_NOTIFICACION_LABEL[canal]}
                    </label>
                  ))}
                </div>
              </Field>
            </div>
            <DrawerFooter className="border-t px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>Guardar</Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      <Drawer open={detailOpen} onOpenChange={setDetailOpen} direction="right">
        <DrawerContent className="h-full overflow-y-auto p-0 sm:max-w-xl">
          <DrawerHeader className="border-b px-6 py-5 text-left">
            <DrawerTitle>{selected?.titulo ?? "Detalle de alerta"}</DrawerTitle>
            <DrawerDescription>{selected?.codigo}</DrawerDescription>
          </DrawerHeader>
          {selected && (
            <div className="space-y-5 px-6 py-5">
              <p className="whitespace-pre-wrap text-sm text-slate-700">{selected.contenido}</p>
              <Section title="Segmentos">
                {(selected.segmentos ?? []).length === 0 ? (
                  <p className="text-sm text-slate-500">Audiencia general activa.</p>
                ) : (
                  selected.segmentos.map((segmento) => (
                    <p key={segmento.id} className="text-sm text-slate-700">
                      {SEGMENTO_ALERTA_LABEL[segmento.tipo]}: {segmento.valor}
                    </p>
                  ))
                )}
              </Section>
              <Section title="Entregas">
                {(selected.entregas ?? []).length === 0 ? (
                  <p className="text-sm text-slate-500">Aun no hay entregas registradas.</p>
                ) : (
                  selected.entregas.slice(0, 12).map((entrega) => (
                    <div key={entrega.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span>{entrega.destinatario_nombre ?? entrega.destinatario_email ?? "Destinatario"}</span>
                        <Badge className={cn("border-0", ENTREGA_ESTADO_STYLE[entrega.estado].className)}>
                          {ENTREGA_ESTADO_STYLE[entrega.estado].label}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {CANAL_NOTIFICACION_LABEL[entrega.canal]} - {formatDateTime(entrega.fecha_envio)}
                      </p>
                    </div>
                  ))
                )}
              </Section>
              <Section title="Eventos">
                {(selected.eventos ?? []).length === 0 ? (
                  <p className="text-sm text-slate-500">Sin eventos.</p>
                ) : (
                  selected.eventos.map((evento) => (
                    <p key={evento.id} className="text-sm text-slate-700">
                      {evento.tipo_evento} - {formatDateTime(evento.created_at)}
                    </p>
                  ))
                )}
              </Section>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      {children}
    </section>
  );
}

function Metric({ title, value, icon: Icon }: { title: string; value: number; icon: typeof Megaphone }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs tracking-wide text-slate-500 uppercase">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
        </div>
        <div className="rounded-lg bg-[#001C55]/10 p-2 text-[#001C55]">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
