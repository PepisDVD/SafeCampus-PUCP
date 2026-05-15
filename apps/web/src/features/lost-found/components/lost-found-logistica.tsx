"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import {
  Badge,
  Button,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
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
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "@safecampus/ui-kit";
import { CheckCircle2, Edit3, Eye, PackageCheck, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { lostFoundClient } from "../client";
import { estadoLabel, estadoLfTone, tipoLabel } from "../presentation";
import type { CasoLfDetail, CasoLfListItem, CustodiaLf, ListResponse } from "../types";

type CustodiaPage = ListResponse<CustodiaLf> & { page: number; per_page: number };

type Props = {
  initialCustodias: CustodiaPage;
  casos: CasoLfListItem[];
};

const ESTADOS = ["ACTIVA", "PROXIMA_VENCER", "VENCIDA", "DEVUELTA", "DESCARTADA"] as const;

export function LostFoundLogistica({ initialCustodias, casos }: Props) {
  const [data, setData] = useState(initialCustodias);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("ACTIVA");
  const [vencimiento, setVencimiento] = useState("TODOS");
  const [perPage, setPerPage] = useState(String(initialCustodias.per_page));
  const [drawer, setDrawer] = useState<"crear" | "editar" | "devolver" | "descartar" | "trazabilidad" | null>(null);
  const [selected, setSelected] = useState<CustodiaLf | null>(null);
  const [isPending, startTransition] = useTransition();

  const candidatos = useMemo(
    () => casos.filter((caso) => caso.tipo === "ENCONTRADO" && !["CERRADO", "DEVUELTO", "DESCARTADO"].includes(caso.estado)),
    [casos],
  );

  const load = (page = data.page) => {
    startTransition(async () => {
      const params = buildParams({ search, estado, vencimiento, page: String(page), per_page: perPage });
      setData(await lostFoundClient.custodias(params));
    });
  };

  const openAction = (nextDrawer: typeof drawer, custodia: CustodiaLf) => {
    setSelected(custodia);
    setDrawer(nextDrawer);
  };

  const closeDrawer = () => {
    setDrawer(null);
    setSelected(null);
  };

  const totalPages = Math.max(1, Math.ceil(data.total / data.per_page));

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Logistica Lost & Found</h1>
          <p className="text-sm text-slate-500">Custodia fisica, devoluciones y descarte de objetos encontrados.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => load()} disabled={isPending}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button onClick={() => setDrawer("crear")}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar objeto
          </Button>
        </div>
      </div>

      <section className="rounded-lg border bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_repeat(4,minmax(150px,0.5fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Codigo, objeto, ubicacion u observacion" />
          </div>
          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos los estados</SelectItem>
              {ESTADOS.map((item) => <SelectItem key={item} value={item}>{estadoLabel(item)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={vencimiento} onValueChange={setVencimiento}>
            <SelectTrigger><SelectValue placeholder="Vencimiento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="vigente">Vigentes</SelectItem>
              <SelectItem value="proxima">Proximas a vencer</SelectItem>
              <SelectItem value="vencida">Vencidas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={perPage} onValueChange={setPerPage}>
            <SelectTrigger><SelectValue placeholder="Filas" /></SelectTrigger>
            <SelectContent>
              {["10", "20", "50"].map((value) => <SelectItem key={value} value={value}>{value} filas</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => load(1)} disabled={isPending}>Aplicar filtros</Button>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Caso</TableHead>
              <TableHead>Objeto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Ubicacion</TableHead>
              <TableHead>Recepcion</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
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
                  <Badge variant="outline" className={estadoLfTone[custodia.estado] ?? "border-slate-200 bg-slate-50 text-slate-600"}>
                    {estadoLabel(custodia.estado)}
                  </Badge>
                </TableCell>
                <TableCell>{custodia.ubicacion_custodia}</TableCell>
                <TableCell>{formatDate(custodia.fecha_recepcion)}</TableCell>
                <TableCell>
                  <span className={isExpired(custodia.fecha_vencimiento) && custodia.estado === "ACTIVA" ? "font-medium text-rose-700" : ""}>
                    {formatDate(custodia.fecha_vencimiento)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => openAction("editar", custodia)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openAction("trazabilidad", custodia)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={() => openAction("devolver", custodia)}>
                      <PackageCheck className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openAction("descartar", custodia)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-slate-500">
          <span>{data.total} registros · pagina {data.page} de {totalPages}</span>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  className={data.page <= 1 || isPending ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  onClick={(event) => {
                    event.preventDefault();
                    if (data.page > 1 && !isPending) load(data.page - 1);
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  className={data.page >= totalPages || isPending ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  onClick={(event) => {
                    event.preventDefault();
                    if (data.page < totalPages && !isPending) load(data.page + 1);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </section>

      <CustodiaDrawer
        mode={drawer}
        custodia={selected}
        candidatos={candidatos}
        onClose={closeDrawer}
        onDone={() => {
          closeDrawer();
          load(1);
        }}
      />
    </div>
  );
}

function CustodiaDrawer({
  mode,
  custodia,
  candidatos,
  onClose,
  onDone,
}: {
  mode: "crear" | "editar" | "devolver" | "descartar" | "trazabilidad" | null;
  custodia: CustodiaLf | null;
  candidatos: CasoLfListItem[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [casoId, setCasoId] = useState(candidatos[0]?.id ?? "");
  const [trace, setTrace] = useState<CasoLfDetail | null>(null);
  const [isCaseLoading, setIsCaseLoading] = useState(false);
  const [observacionesDraft, setObservacionesDraft] = useState("");
  const selectedCase = candidatos.find((caso) => caso.id === casoId);
  const title = mode === "crear" ? "Registrar objeto en custodia" : mode === "editar" ? "Editar custodia" : mode === "devolver" ? "Registrar devolucion" : mode === "trazabilidad" ? "Trazabilidad del objeto" : "Registrar descarte";

  useEffect(() => {
    setTrace(null);
    if (mode !== "trazabilidad" || !custodia) return;
    startTransition(async () => setTrace(await lostFoundClient.detalle(custodia.caso_id)));
  }, [custodia, mode]);

  useEffect(() => {
    if (mode !== "crear") return;
    setIsCaseLoading(true);
    const timeoutId = setTimeout(() => {
      setObservacionesDraft(selectedCaseSummary(selectedCase));
      setIsCaseLoading(false);
    }, 250);
    return () => clearTimeout(timeoutId);
  }, [mode, selectedCase]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        if (mode === "crear") {
          await lostFoundClient.registrarCustodia(casoId, {
            ubicacion_custodia: String(form.get("ubicacion_custodia")),
            observaciones: optional(observacionesDraft),
            es_perecible: form.get("es_perecible") === "true",
          });
        } else if (mode === "editar" && custodia) {
          await lostFoundClient.actualizarCustodia(custodia.id, {
            ubicacion_custodia: optional(form.get("ubicacion_custodia")),
            observaciones: optional(form.get("observaciones")),
          });
        } else if (mode === "devolver" && custodia) {
          await lostFoundClient.devolver(custodia.id, {
            reclamante_id: String(form.get("reclamante_id")),
            metodo_verificacion: String(form.get("metodo_verificacion")),
            observaciones: optional(form.get("observaciones")),
          });
        } else if (mode === "descartar" && custodia) {
          await lostFoundClient.descartar(custodia.id, {
            motivo: String(form.get("motivo")),
            destino_descarte: optional(form.get("destino_descarte")),
            observaciones: optional(form.get("observaciones")),
          });
        }
        toast.success("Operacion registrada");
        onDone();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo registrar la operacion");
      }
    });
  };

  return (
    <Drawer open={mode !== null} onOpenChange={(open) => !open && onClose()} direction="right">
      <DrawerContent className="h-full overflow-hidden p-0 sm:max-w-xl">
        <form onSubmit={submit} className="flex min-h-full flex-col">
          <DrawerHeader className="border-b px-6 py-5 text-left">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>Actualiza la trazabilidad fisica del objeto encontrado.</DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 space-y-4 px-6 py-5">
            {mode === "crear" && (
              <>
                <Field label="Caso encontrado">
                  <Select value={casoId} onValueChange={setCasoId} required>
                    <SelectTrigger><SelectValue placeholder="Selecciona un caso" /></SelectTrigger>
                    <SelectContent>
                      {candidatos.map((caso) => (
                        <SelectItem key={caso.id} value={caso.id}>{caso.codigo} · {caso.titulo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {selectedCase && (
                  <div className="rounded-lg border bg-slate-50 p-3 text-sm">
                    {isCaseLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-2/3" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium text-slate-950">{selectedCase.titulo}</p>
                        <p className="mt-1 line-clamp-3 text-slate-600">{selectedCase.descripcion}</p>
                        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                          <div><dt className="text-xs text-slate-500">Codigo</dt><dd>{selectedCase.codigo}</dd></div>
                          <div><dt className="text-xs text-slate-500">Categoria</dt><dd>{selectedCase.categoria_nombre ?? "Sin categoria"}</dd></div>
                          <div><dt className="text-xs text-slate-500">Lugar reportado</dt><dd>{selectedCase.lugar_referencia}</dd></div>
                          <div><dt className="text-xs text-slate-500">Marca/color</dt><dd>{[selectedCase.marca, selectedCase.color_principal].filter(Boolean).join(" · ") || "No indicado"}</dd></div>
                        </dl>
                      </>
                    )}
                  </div>
                )}
                <Field label="Tipo de objeto">
                  <Select name="es_perecible" defaultValue="false">
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
                <Field label="Ubicacion fisica">
                  <Input name="ubicacion_custodia" defaultValue={custodia?.ubicacion_custodia ?? ""} required placeholder="Ej. Estante B, casillero 04" />
                </Field>
                <Field label="Observaciones">
                  {isCaseLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ) : (
                    <Textarea
                      name="observaciones"
                      value={mode === "crear" ? observacionesDraft : (custodia?.observaciones ?? "")}
                      onChange={(event) => {
                        if (mode === "crear") {
                          setObservacionesDraft(event.target.value);
                        }
                      }}
                      placeholder="Estado del objeto, embalaje, evidencia de recepcion"
                    />
                  )}
                </Field>
              </>
            )}

            {mode === "trazabilidad" && custodia && (
              <TraceTimeline custodia={custodia} caso={trace} />
            )}

            {mode === "devolver" && (
              <>
                <Field label="ID del reclamante verificado">
                  <Input name="reclamante_id" required placeholder="UUID del usuario validado" />
                </Field>
                <Field label="Metodo de verificacion">
                  <Input name="metodo_verificacion" required defaultValue="SSO_PUCP_CARNET" />
                </Field>
                <Field label="Observaciones">
                  <Textarea name="observaciones" placeholder="Detalle de verificacion y entrega" />
                </Field>
              </>
            )}

            {mode === "descartar" && (
              <>
                <Field label="Motivo">
                  <Textarea name="motivo" required placeholder="Vencimiento, deterioro, donacion autorizada..." />
                </Field>
                <Field label="Destino">
                  <Input name="destino_descarte" placeholder="Donacion, reciclaje, Oficina de Hallazgos" />
                </Field>
                <Field label="Observaciones">
                  <Textarea name="observaciones" />
                </Field>
              </>
            )}
          </div>

          <DrawerFooter className="mt-auto border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            {mode !== "trazabilidad" && (
              <Button type="submit" disabled={isPending}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Guardar
              </Button>
            )}
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}

function TraceTimeline({ custodia, caso }: { custodia: CustodiaLf; caso: CasoLfDetail | null }) {
  const events = [
    { title: "Caso publicado", detail: caso ? `${caso.codigo} · ${caso.titulo}` : custodia.codigo ?? custodia.caso_id, at: caso?.created_at ?? custodia.created_at },
    { title: "Ingreso a custodia", detail: custodia.ubicacion_custodia, at: custodia.fecha_recepcion },
    ...(caso?.historial ?? []).map((item) => ({
      title: estadoLabel(item.estado_nuevo),
      detail: item.comentario || item.accion,
      at: item.created_at,
    })),
    ...(custodia.reclamante_id ? [{ title: "Devolucion registrada", detail: custodia.metodo_verificacion ?? "Verificacion operativa", at: custodia.updated_at }] : []),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-slate-50 p-3 text-sm">
        <p className="font-medium text-slate-950">{custodia.codigo ?? custodia.caso_id}</p>
        <p className="text-slate-600">{custodia.titulo ?? "Objeto encontrado"}</p>
        <p className="mt-2 text-xs text-slate-500">Vence: {formatDate(custodia.fecha_vencimiento)}</p>
      </div>
      <div className="space-y-0">
        {events.map((event, index) => (
          <div key={`${event.title}-${event.at}-${index}`} className="grid grid-cols-[18px_1fr] gap-3">
            <div className="flex flex-col items-center">
              <span className="mt-1 h-3 w-3 rounded-full bg-[#001C55]" />
              {index < events.length - 1 && <span className="h-full min-h-10 w-px bg-slate-200" />}
            </div>
            <div className="pb-4">
              <p className="text-sm font-medium text-slate-950">{event.title}</p>
              <p className="text-sm text-slate-600">{event.detail}</p>
              <p className="mt-1 text-xs text-slate-500">{formatDate(event.at)}</p>
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

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
}

function isExpired(value: string) {
  return new Date(value).getTime() < Date.now();
}
