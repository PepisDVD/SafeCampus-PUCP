"use client";

import Link from "next/link";
import { es } from "date-fns/locale";
import type { ReactNode } from "react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
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
  Calendar,
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
  Input,
  Label,
  MultiSelectFilter,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TablePaginationBar,
  Textarea,
} from "@safecampus/ui-kit";
import { CalendarDays, CheckCircle2, Clock3, Download, Edit3, Eye, MoreHorizontal, PackageCheck, Plus, RefreshCw, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { toast } from "@safecampus/ui-kit";
import { lostFoundClient } from "../client";
import { estadoLabel, formatDateTimePe } from "../presentation";
import { downloadReturnedCustodyPdf } from "../return-pdf";
import { EstadoLfBadge } from "./estado-lf-badge";
import { CharCounter, LF_TEXT_LIMITS } from "./text-field-help";
import { ReturnRegistrationWizard } from "./return-registration-wizard";
import type { UsuarioConRoles } from "@/features/admin/services/usuario.service";
import type { CasoLfDetail, CasoLfListItem, CustodiaLf, ListResponse, MotivoCierreLf, UbicacionMaestra } from "../types";

type CustodiaPage = ListResponse<CustodiaLf> & { page: number; per_page: number };

type Props = {
  initialCustodias: CustodiaPage;
  initialSearch?: string;
  casos: CasoLfListItem[];
  motivosDescarte: MotivoCierreLf[];
  ubicacionesCustodia: UbicacionMaestra[];
  usuarios: UsuarioConRoles[];
  currentUser: {
    id: string;
    roles: string[];
    nombre: string;
    apellido: string;
    codigoInstitucional: string | null;
    telefono: string | null;
    navUser: {
      name: string;
      email: string;
      avatarUrl?: string | null;
    };
  } | null;
};

const ESTADOS = ["ACTIVA", "PROXIMA_VENCER", "VENCIDA", "DEVUELTA", "DESCARTADA"] as const;
const VENCIMIENTOS = [
  { value: "vigente", label: "Vigentes" },
  { value: "proxima", label: "Próximos a vencer" },
  { value: "vencida", label: "Vencidas" },
] as const;

export function LostFoundLogistica({ initialCustodias, initialSearch = "", casos, motivosDescarte, ubicacionesCustodia, usuarios, currentUser }: Props) {
  const [data, setData] = useState(initialCustodias);
  const [search, setSearch] = useState(initialSearch);
  const [estados, setEstados] = useState<string[]>(["ACTIVA", "PROXIMA_VENCER", "VENCIDA"]);
  const [vencimientos, setVencimientos] = useState<string[]>([]);
  const [perPage, setPerPage] = useState(String(initialCustodias.per_page));
  const [drawer, setDrawer] = useState<"crear" | "editar" | "devolver" | "descartar" | "trazabilidad" | null>(null);
  const [selected, setSelected] = useState<CustodiaLf | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: "revertir" | "reactivar"; custodia: CustodiaLf } | null>(null);
  const [isMutating, startMutate] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const latestLoadRef = useRef(0);
  const skipAutoLoadRef = useRef(true);

  // Excluye los casos que ya tienen custodia: al registrar custodia el caso pasa
  // a EN_CUSTODIA, y volver a asignarlo rompe el UNIQUE de custodia por caso.
  const candidatos = useMemo(
    () => casos.filter((caso) => caso.tipo === "ENCONTRADO" && !["EN_CUSTODIA", "CERRADO", "DEVUELTO", "DESCARTADO"].includes(caso.estado)),
    [casos],
  );

  const load = useCallback((page: number) => {
    const requestId = latestLoadRef.current + 1;
    latestLoadRef.current = requestId;
    setIsLoading(true);
    void (async () => {
      try {
        const params = buildParams({
          search,
          estado: estados.join(","),
          vencimiento: vencimientos.join(","),
          page: String(page),
          per_page: perPage,
        });
        const nextData = await lostFoundClient.custodias(params);
        if (latestLoadRef.current === requestId) {
          setData(nextData);
        }
      } catch (error) {
        if (latestLoadRef.current === requestId) {
          toast.error(error instanceof Error ? error.message : "No se pudieron cargar las custodias");
        }
      } finally {
        if (latestLoadRef.current === requestId) {
          setIsLoading(false);
        }
      }
    })();
  }, [estados, perPage, search, vencimientos]);

  useEffect(() => {
    if (skipAutoLoadRef.current) {
      skipAutoLoadRef.current = false;
      return;
    }
    const timeout = window.setTimeout(() => load(1), search.trim() ? 350 : 150);
    return () => window.clearTimeout(timeout);
  }, [estados, load, perPage, search, vencimientos]);

  const openAction = (nextDrawer: typeof drawer, custodia: CustodiaLf) => {
    setSelected(custodia);
    setDrawer(nextDrawer);
  };

  const closeDrawer = () => {
    setDrawer(null);
    setSelected(null);
  };

  const runConfirmAction = () => {
    if (!confirmAction) return;
    const { type, custodia } = confirmAction;
    startMutate(async () => {
      try {
        if (type === "revertir") {
          await lostFoundClient.revertirDevolucion(custodia.id);
          toast.success("Devolución revertida. La custodia volvió a estar operativa y el caso se reabrió.");
        } else {
          await lostFoundClient.reactivarDescarte(custodia.id);
          toast.success("Custodia reactivada según su fecha de vencimiento. El caso se reabrió.");
        }
        setConfirmAction(null);
        load(data.page);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo completar la operación.");
      }
    });
  };

  const totalPages = Math.max(1, Math.ceil(data.total / data.per_page));

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Logística</h1>
          <p className="text-sm text-slate-500">Custodia física, devoluciones y descarte de objetos encontrados.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => load(data.page)} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button onClick={() => setDrawer("crear")}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar objeto
          </Button>
        </div>
      </div>

      <FilterBar>
        <div className="grid gap-3 lg:grid-cols-[1.4fr_repeat(4,minmax(150px,0.5fr))]">
          <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Código, objeto, ubicación u observación" />
          <MultiSelectFilter
            placeholder="Todos los estados"
            options={ESTADOS.map((item) => ({ value: item, label: estadoLabel(item) }))}
            selected={estados}
            onChange={setEstados}
          />
          <MultiSelectFilter
            placeholder="Todos"
            options={VENCIMIENTOS}
            selected={vencimientos}
            onChange={setVencimientos}
          />
          <Select value={perPage} onValueChange={setPerPage}>
            <SelectTrigger><SelectValue placeholder="Filas" /></SelectTrigger>
            <SelectContent>
              {["10", "20", "50"].map((value) => <SelectItem key={value} value={value}>{value} filas</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => load(1)} disabled={isLoading}>Aplicar filtros</Button>
        </div>
      </FilterBar>

      <section className={`overflow-hidden rounded-lg border bg-white transition-opacity ${isLoading ? "opacity-70" : "opacity-100"}`} aria-busy={isLoading}>
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Caso</TableHead>
              <TableHead className="w-52">Objeto</TableHead>
              <TableHead className="w-28">Estado</TableHead>
              <TableHead className="w-64">Ubicación</TableHead>
              <TableHead className="w-44">Recepción</TableHead>
              <TableHead className="w-48">Vencimiento de custodia</TableHead>
              <TableHead className="w-16 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((custodia) => (
              <TableRow key={custodia.id}>
                <TableCell>
                  <Link href={`/lost-found-hilos/${custodia.caso_id}`} className="font-medium text-[#001C55] hover:underline">
                    {custodia.codigo ?? custodia.caso_id}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="max-w-65">
                    <p className="truncate font-medium">{custodia.titulo ?? "Objeto encontrado"}</p>
                    <p className="text-xs text-slate-500">{custodia.es_perecible ? "Perecible" : "Regular"}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <EstadoLfBadge estado={custodia.estado} />
                </TableCell>
                <TableCell className="max-w-64">
                  <p className="truncate" title={custodia.ubicacion_custodia}>
                    {custodia.ubicacion_custodia}
                  </p>
                </TableCell>
                <TableCell>{formatDateTimePe(custodia.fecha_recepcion)}</TableCell>
                <TableCell>
                  <span className={isExpired(custodia.fecha_vencimiento) && custodia.estado === "ACTIVA" ? "font-medium text-rose-700" : ""}>
                    {formatDateTimePe(custodia.fecha_vencimiento)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Acciones para ${custodia.codigo ?? custodia.titulo ?? "custodia"}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      {canEditCustodia(custodia.estado) && (
                        <DropdownMenuItem onSelect={() => openAction("editar", custodia)}>
                          <Edit3 />
                          Editar custodia
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onSelect={() => openAction("trazabilidad", custodia)}>
                        <Eye />
                        Ver trazabilidad
                      </DropdownMenuItem>
                      {isOperativa(custodia.estado) && (
                        <DropdownMenuItem onSelect={() => openAction("devolver", custodia)}>
                          <PackageCheck />
                          Registrar devolución
                        </DropdownMenuItem>
                      )}
                      {custodia.estado === "DEVUELTA" && (
                        <>
                          <DropdownMenuItem onSelect={() => downloadReturnedCustodyPdf(custodia)}>
                            <Download />
                            Exportar PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setConfirmAction({ type: "revertir", custodia })}>
                            <Undo2 />
                            Revertir devolución
                          </DropdownMenuItem>
                        </>
                      )}
                      {custodia.estado === "DESCARTADA" && (
                        <DropdownMenuItem onSelect={() => setConfirmAction({ type: "reactivar", custodia })}>
                          <RotateCcw />
                          Reactivar custodia
                        </DropdownMenuItem>
                      )}
                      {canDiscardCustodia(custodia.estado) && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onSelect={() => openAction("descartar", custodia)}>
                            <Trash2 />
                            Marcar como descartada
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {data.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-28 text-center text-sm text-slate-500">
                  No hay objetos en custodia con los filtros seleccionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePaginationBar
          page={data.page}
          totalPages={totalPages}
          total={data.total}
          perPage={data.per_page}
          isPending={isLoading}
          onPrev={() => load(data.page - 1)}
          onNext={() => load(data.page + 1)}
        />
      </section>

      <CustodiaDrawer
        key={`${drawer ?? "closed"}-${selected?.id ?? "new"}`}
        mode={drawer}
        custodia={selected}
        candidatos={candidatos}
        motivosDescarte={motivosDescarte}
        onClose={closeDrawer}
        onDone={() => {
          closeDrawer();
          load(1);
        }}
      />
      <ReturnRegistrationWizard
        open={drawer === "devolver"}
        custodia={selected}
        casos={casos}
        usuarios={usuarios}
        ubicacionesCustodia={ubicacionesCustodia}
        currentUser={currentUser}
        onOpenChange={(open) => {
          if (!open) closeDrawer();
        }}
        onDone={() => {
          closeDrawer();
          load(1);
        }}
      />

      <AlertDialog open={Boolean(confirmAction)} onOpenChange={(open) => !open && !isMutating && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "revertir" ? "Revertir devolución" : "Reactivar custodia"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "revertir"
                ? "La custodia volverá a un estado operativo según su fecha de vencimiento, se limpiarán los datos de la devolución y el caso asociado se reabrirá. La trazabilidad se conserva."
                : "La custodia volverá a un estado operativo (Activa, Próxima a vencer o Vencida) según su fecha de vencimiento, se limpiarán los datos del descarte y el caso asociado se reabrirá. La trazabilidad se conserva."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                runConfirmAction();
              }}
              disabled={isMutating}
            >
              {confirmAction?.type === "revertir" ? "Revertir" : "Reactivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function isOperativa(estado: string) {
  return estado === "ACTIVA" || estado === "PROXIMA_VENCER";
}

function canEditCustodia(estado: string) {
  return isOperativa(estado) || estado === "VENCIDA";
}

function canDiscardCustodia(estado: string) {
  return isOperativa(estado) || estado === "VENCIDA";
}

function CustodiaDrawer({
  mode,
  custodia,
  candidatos,
  motivosDescarte,
  onClose,
  onDone,
}: {
  mode: "crear" | "editar" | "devolver" | "descartar" | "trazabilidad" | null;
  custodia: CustodiaLf | null;
  candidatos: CasoLfListItem[];
  motivosDescarte: MotivoCierreLf[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [casoId, setCasoId] = useState(candidatos[0]?.id ?? "");
  const [trace, setTrace] = useState<{ casoId: string; data: CasoLfDetail } | null>(null);
  const [ubicacion, setUbicacion] = useState(custodia?.ubicacion_custodia ?? "");
  const [observacionesDraft, setObservacionesDraft] = useState(
    mode === "crear" ? selectedCaseSummary(candidatos[0]) : (custodia?.observaciones ?? ""),
  );
  const [esPerecible, setEsPerecible] = useState(custodia?.es_perecible ? "true" : "false");
  const [fechaVencimiento, setFechaVencimiento] = useState(
    custodia ? toDateTimeLocalValue(custodia.fecha_vencimiento) : "",
  );
  const [motivoId, setMotivoId] = useState("");
  const [motivoOtro, setMotivoOtro] = useState("");
  const [destinoDescarte, setDestinoDescarte] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const selectedCase = candidatos.find((caso) => caso.id === casoId);
  const selectedMotivo = motivosDescarte.find((motivo) => motivo.id === motivoId);
  const traceCase = custodia && trace?.casoId === custodia.caso_id ? trace.data : null;
  const title = mode === "crear" ? "Registrar objeto en custodia" : mode === "editar" ? "Editar custodia" : mode === "devolver" ? "Registrar devolución" : mode === "trazabilidad" ? "Trazabilidad del objeto" : "Registrar descarte";

  useEffect(() => {
    if (mode !== "trazabilidad" || !custodia) return;
    startTransition(async () => {
      const data = await lostFoundClient.detalle(custodia.caso_id);
      setTrace({ casoId: custodia.caso_id, data });
    });
  }, [custodia, mode]);

  const formErrors = validateCustodiaForm({
    mode,
    casoId,
    ubicacion,
    observaciones: observacionesDraft,
    fechaVencimiento,
    motivoId,
    motivoOtro,
    destinoDescarte,
    motivoRequiereObservacion: selectedMotivo?.requiere_observacion ?? false,
  });
  const errorFor = (field: string) => submitted || touched[field] ? formErrors[field] : undefined;
  const touch = (field: string) => setTouched((current) => ({ ...current, [field]: true }));

  const executeSubmit = (form?: HTMLFormElement | null) => {
    startTransition(async () => {
      try {
        if (mode === "crear") {
          await lostFoundClient.registrarCustodia(casoId, {
            ubicacion_custodia: ubicacion.trim(),
            observaciones: optional(observacionesDraft),
            es_perecible: esPerecible === "true",
          });
        } else if (mode === "editar" && custodia) {
          await lostFoundClient.actualizarCustodia(custodia.id, {
            ubicacion_custodia: ubicacion.trim(),
            observaciones: observacionesDraft.trim() || null,
            fecha_vencimiento: new Date(fechaVencimiento).toISOString(),
          });
        } else if (mode === "devolver" && custodia && form) {
          const formData = new FormData(form);
          await lostFoundClient.devolver(custodia.id, {
            reclamante_id: String(formData.get("reclamante_id")),
            metodo_verificacion: String(formData.get("metodo_verificacion")),
            observaciones: optional(formData.get("observaciones")),
          });
        } else if (mode === "descartar" && custodia) {
          await lostFoundClient.descartar(custodia.id, {
            motivo_cierre_id: motivoId,
            motivo_otro: optional(motivoOtro),
            destino_descarte: optional(destinoDescarte),
            observaciones: optional(observacionesDraft),
          });
        }
        toast.success(mode === "descartar" ? "Custodia marcada como descartada" : "Operación registrada");
        setDiscardConfirmOpen(false);
        onDone();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo registrar la operación");
      }
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(formErrors).length > 0) {
      toast.error("Revisa los campos marcados antes de continuar.");
      return;
    }
    if (mode === "descartar") {
      setDiscardConfirmOpen(true);
      return;
    }
    executeSubmit(event.currentTarget);
  };

  return (
    <Drawer open={mode !== null && mode !== "devolver"} onOpenChange={(open) => !open && onClose()} direction="right">
      <DrawerContent className="h-full overflow-hidden p-0 sm:max-w-xl">
        <form id="custodia-drawer-form" onSubmit={submit} className="flex min-h-full flex-col">
          <DrawerHeader className="border-b px-6 py-5 text-left">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>Actualiza la trazabilidad física del objeto encontrado.</DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {mode === "crear" && (
              <>
                <Field label="Caso encontrado">
                  <Select
                    value={casoId}
                    onValueChange={(value) => {
                      setCasoId(value);
                      setObservacionesDraft(selectedCaseSummary(candidatos.find((caso) => caso.id === value)));
                    }}
                  >
                    <SelectTrigger aria-invalid={Boolean(errorFor("casoId"))} onBlur={() => touch("casoId")}><SelectValue placeholder="Selecciona un caso" /></SelectTrigger>
                    <SelectContent>
                      {candidatos.map((caso) => (
                        <SelectItem key={caso.id} value={caso.id}>{caso.codigo} · {caso.titulo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={errorFor("casoId")} />
                </Field>
                {selectedCase && <CaseSummary caso={selectedCase} />}
                <Field label="Tipo de objeto">
                  <Select value={esPerecible} onValueChange={setEsPerecible}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">Regular</SelectItem>
                      <SelectItem value="true">Perecible</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </>
            )}

            {(mode === "crear" || mode === "editar") && (
              <>
                <Field label="Ubicación física">
                  <Textarea
                    value={ubicacion}
                    onChange={(event) => setUbicacion(event.target.value)}
                    onBlur={() => touch("ubicacion")}
                    maxLength={LF_TEXT_LIMITS.custodia_ubicacion.max}
                    aria-invalid={Boolean(errorFor("ubicacion"))}
                    rows={3}
                    placeholder="Ej. Estante B, casillero 04"
                  />
                  <CharCounter value={ubicacion} {...LF_TEXT_LIMITS.custodia_ubicacion} />
                  <FieldError message={errorFor("ubicacion")} />
                </Field>
                <Field label="Observaciones">
                  <Textarea
                    value={observacionesDraft}
                    onChange={(event) => setObservacionesDraft(event.target.value)}
                    onBlur={() => touch("observaciones")}
                    maxLength={LF_TEXT_LIMITS.custodia_observaciones.max}
                    aria-invalid={Boolean(errorFor("observaciones"))}
                    rows={5}
                    placeholder="Estado del objeto, embalaje, evidencia de recepción"
                  />
                  <CharCounter value={observacionesDraft} {...LF_TEXT_LIMITS.custodia_observaciones} />
                  <FieldError message={errorFor("observaciones")} />
                </Field>
                {mode === "editar" && (
                  <Field label="Fecha de vencimiento de custodia">
                    <CustodyDateTimePicker
                      value={fechaVencimiento}
                      onChange={setFechaVencimiento}
                      onBlur={() => touch("fechaVencimiento")}
                      invalid={Boolean(errorFor("fechaVencimiento"))}
                    />
                    <p className="text-xs text-slate-500">El estado se recalculará según la fecha y la política vigente de custodia.</p>
                    <FieldError message={errorFor("fechaVencimiento")} />
                  </Field>
                )}
              </>
            )}

            {mode === "trazabilidad" && custodia && (
              traceCase
                ? <TraceTimeline custodia={custodia} caso={traceCase} />
                : <TraceTimelineSkeleton />
            )}

            {mode === "descartar" && (
              <>
                <Field label="Motivo">
                  <Select value={motivoId} onValueChange={setMotivoId}>
                    <SelectTrigger aria-invalid={Boolean(errorFor("motivoId"))} onBlur={() => touch("motivoId")}>
                      <SelectValue placeholder="Selecciona un motivo configurado" />
                    </SelectTrigger>
                    <SelectContent>
                      {motivosDescarte.map((motivo) => (
                        <SelectItem key={motivo.id} value={motivo.id}>{motivo.nombre}</SelectItem>
                      ))}
                      <SelectItem value="OTRO">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError message={errorFor("motivoId")} />
                </Field>
                {motivoId === "OTRO" && (
                  <Field label="Detalle del motivo">
                    <Textarea
                      value={motivoOtro}
                      onChange={(event) => setMotivoOtro(event.target.value)}
                      onBlur={() => touch("motivoOtro")}
                      maxLength={LF_TEXT_LIMITS.descarte_motivo_otro.max}
                      aria-invalid={Boolean(errorFor("motivoOtro"))}
                      rows={4}
                      placeholder="Describe el motivo del descarte"
                    />
                    <CharCounter value={motivoOtro} {...LF_TEXT_LIMITS.descarte_motivo_otro} />
                    <FieldError message={errorFor("motivoOtro")} />
                  </Field>
                )}
                <Field label="Destino">
                  <Textarea
                    value={destinoDescarte}
                    onChange={(event) => setDestinoDescarte(event.target.value)}
                    onBlur={() => touch("destinoDescarte")}
                    maxLength={LF_TEXT_LIMITS.descarte_destino.max}
                    aria-invalid={Boolean(errorFor("destinoDescarte"))}
                    rows={3}
                    placeholder="Donación, reciclaje, Oficina de Hallazgos"
                  />
                  <CharCounter value={destinoDescarte} {...LF_TEXT_LIMITS.descarte_destino} />
                  <FieldError message={errorFor("destinoDescarte")} />
                </Field>
                <Field label="Observaciones">
                  <Textarea
                    value={observacionesDraft}
                    onChange={(event) => setObservacionesDraft(event.target.value)}
                    onBlur={() => touch("observaciones")}
                    maxLength={LF_TEXT_LIMITS.descarte_observaciones.max}
                    aria-invalid={Boolean(errorFor("observaciones"))}
                    rows={5}
                  />
                  <CharCounter value={observacionesDraft} {...LF_TEXT_LIMITS.descarte_observaciones} />
                  <FieldError message={errorFor("observaciones")} />
                </Field>
              </>
            )}
          </div>

          <DrawerFooter className="mt-auto border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            {mode !== "trazabilidad" && (
              <Button type="submit" disabled={isPending} variant={mode === "descartar" ? "destructive" : "default"}>
                {mode === "descartar" ? <Trash2 className="mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                {mode === "descartar" ? "Marcar descartada" : "Guardar"}
              </Button>
            )}
          </DrawerFooter>
        </form>
        <AlertDialog open={discardConfirmOpen} onOpenChange={setDiscardConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar descarte del objeto</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción marcará la custodia como descartada y cerrará el caso asociado. La trazabilidad se conservará.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => executeSubmit()} disabled={isPending} className="bg-rose-600 hover:bg-rose-700">
                Marcar descartada
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DrawerContent>
    </Drawer>
  );
}

function CaseSummary({ caso }: { caso: CasoLfListItem }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-3 text-sm">
      <p className="font-medium text-slate-950">{caso.titulo}</p>
      <p className="mt-1 line-clamp-3 text-slate-600">{caso.descripcion}</p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <div><dt className="text-xs text-slate-500">Código</dt><dd>{caso.codigo}</dd></div>
        <div><dt className="text-xs text-slate-500">Categoría</dt><dd>{caso.categoria_nombre ?? "Sin categoría"}</dd></div>
        <div><dt className="text-xs text-slate-500">Lugar reportado</dt><dd>{caso.lugar_referencia}</dd></div>
        <div><dt className="text-xs text-slate-500">Marca/color</dt><dd>{[caso.marca, caso.color_principal].filter(Boolean).join(" · ") || "No indicado"}</dd></div>
      </dl>
    </div>
  );
}

function CustodyDateTimePicker({
  value,
  onChange,
  onBlur,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseDateTimeLocal(value);
  const time = value.slice(11, 16) || "00:00";

  const selectDate = (date?: Date) => {
    if (!date) return;
    const current = selectedDate ?? new Date();
    date.setHours(current.getHours(), current.getMinutes(), 0, 0);
    onChange(toDateTimeLocalValue(date));
    setOpen(false);
    onBlur();
  };

  const selectTime = (nextTime: string) => {
    const [hours, minutes] = nextTime.split(":").map(Number);
    const date = selectedDate ?? new Date();
    date.setHours(hours || 0, minutes || 0, 0, 0);
    onChange(toDateTimeLocalValue(date));
  };

  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem]">
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) onBlur();
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            aria-invalid={invalid}
            className="justify-start text-left font-normal aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
          >
            <CalendarDays className="mr-2 h-4 w-4 text-slate-500" />
            {selectedDate ? formatPickerDate(selectedDate) : "Seleccionar fecha"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={selectDate}
            defaultMonth={selectedDate}
            locale={es}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <div className="relative">
        <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          type="time"
          value={time}
          onChange={(event) => selectTime(event.target.value)}
          onBlur={onBlur}
          aria-invalid={invalid}
          className="pl-9"
        />
      </div>
    </div>
  );
}

function TraceTimeline({ custodia, caso }: { custodia: CustodiaLf; caso: CasoLfDetail }) {
  const events = [
    { title: "Caso publicado", detail: `${caso.codigo} · ${caso.titulo}`, at: caso.created_at },
    { estado: "EN_CUSTODIA", detail: custodia.ubicacion_custodia, at: custodia.fecha_recepcion },
    ...caso.historial.map((item) => ({
      estado: item.estado_nuevo,
      title: estadoLabel(item.estado_nuevo),
      detail: item.comentario || item.accion,
      at: item.created_at,
    })),
    ...(custodia.reclamante_id ? [{
      estado: "DEVUELTO",
      detail: custodia.metodo_verificacion ?? "Verificación operativa",
      at: custodia.updated_at,
    }] : []),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <div className="space-y-4">
      <div className="space-y-0">
        {events.map((event, index) => (
          <div key={`${event.estado ?? event.title}-${event.at}-${index}`} className="grid grid-cols-[18px_1fr] gap-3">
            <div className="flex flex-col items-center">
              <span className="mt-1 h-3 w-3 rounded-full bg-[#001C55]" />
              {index < events.length - 1 && <span className="h-full min-h-10 w-px bg-slate-200" />}
            </div>
            <div className="pb-4">
              {event.estado
                ? <EstadoLfBadge estado={event.estado} />
                : <p className="text-sm font-medium text-slate-950">{event.title}</p>}
              <p className="text-sm text-slate-600">{event.detail}</p>
              <p className="mt-1 text-xs text-slate-500">{formatDateTimePe(event.at)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TraceTimelineSkeleton() {
  return (
    <div className="space-y-5" aria-label="Cargando trazabilidad">
      <div className="space-y-5">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="grid grid-cols-[18px_1fr] gap-3">
            <Skeleton className="mt-1 h-3 w-3 rounded-full" />
            <div className="space-y-2 pb-3">
              <Skeleton className="h-5 w-28 rounded-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
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

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs font-medium text-rose-600">{message}</p> : null;
}

function validateCustodiaForm({
  mode,
  casoId,
  ubicacion,
  observaciones,
  fechaVencimiento,
  motivoId,
  motivoOtro,
  destinoDescarte,
  motivoRequiereObservacion,
}: {
  mode: "crear" | "editar" | "devolver" | "descartar" | "trazabilidad" | null;
  casoId: string;
  ubicacion: string;
  observaciones: string;
  fechaVencimiento: string;
  motivoId: string;
  motivoOtro: string;
  destinoDescarte: string;
  motivoRequiereObservacion: boolean;
}) {
  const errors: Record<string, string> = {};
  if (mode === "crear" && !casoId) errors.casoId = "Selecciona un caso encontrado.";
  if (mode === "crear" || mode === "editar") {
    const locationLength = ubicacion.trim().length;
    if (locationLength < LF_TEXT_LIMITS.custodia_ubicacion.min) {
      errors.ubicacion = `La ubicación debe tener al menos ${LF_TEXT_LIMITS.custodia_ubicacion.min} caracteres.`;
    }
    if (ubicacion.length > LF_TEXT_LIMITS.custodia_ubicacion.max) errors.ubicacion = "La ubicación supera el límite permitido.";
    if (observaciones.length > LF_TEXT_LIMITS.custodia_observaciones.max) errors.observaciones = "Las observaciones superan el límite permitido.";
  }
  if (mode === "editar" && (!fechaVencimiento || Number.isNaN(new Date(fechaVencimiento).getTime()))) {
    errors.fechaVencimiento = "Ingresa una fecha de vencimiento válida.";
  }
  if (mode === "descartar") {
    if (!motivoId) errors.motivoId = "Selecciona un motivo de descarte.";
    if (motivoId === "OTRO" && motivoOtro.trim().length < LF_TEXT_LIMITS.descarte_motivo_otro.min) {
      errors.motivoOtro = `Detalla el motivo con al menos ${LF_TEXT_LIMITS.descarte_motivo_otro.min} caracteres.`;
    }
    if (motivoOtro.length > LF_TEXT_LIMITS.descarte_motivo_otro.max) errors.motivoOtro = "El motivo supera el límite permitido.";
    if (destinoDescarte.length > LF_TEXT_LIMITS.descarte_destino.max) errors.destinoDescarte = "El destino supera el límite permitido.";
    if (observaciones.length > LF_TEXT_LIMITS.descarte_observaciones.max) errors.observaciones = "Las observaciones superan el límite permitido.";
    if (motivoRequiereObservacion && !observaciones.trim()) errors.observaciones = "Este motivo configurado requiere observaciones.";
  }
  return errors;
}

function selectedCaseSummary(caso?: CasoLfListItem) {
  if (!caso) return "";
  return [
    `Caso ${caso.codigo}: ${caso.titulo}`,
    caso.categoria_nombre ? `Categoria: ${caso.categoria_nombre}` : "",
    caso.lugar_referencia ? `Lugar reportado: ${caso.lugar_referencia}` : "",
    [caso.marca, caso.color_principal].filter(Boolean).join(" · "),
  ].filter(Boolean).join("\n");
}

function buildParams(values: Record<string, string>) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value && value !== "TODOS"));
}

function optional(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function parseDateTimeLocal(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function formatPickerDate(date: Date) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function toDateTimeLocalValue(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function isExpired(value: string) {
  return new Date(value).getTime() < Date.now();
}
