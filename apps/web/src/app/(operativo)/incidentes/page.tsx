"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
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
} from "@safecampus/ui-kit";
import { AlertTriangle, Eye, Filter, RefreshCcw, Search, ShieldAlert } from "lucide-react";

import {
  incidentesApi,
  type EstadoIncidente,
  type IncidenteListItemApi,
  type TipoCanal,
} from "@/lib/api/incidentes";

const estados: Array<EstadoIncidente | "TODOS"> = [
  "TODOS",
  "RECIBIDO",
  "EN_EVALUACION",
  "EN_ATENCION",
  "ESCALADO",
  "PENDIENTE_INFO",
  "RESUELTO",
  "CERRADO",
];

const canales: Array<TipoCanal | "TODOS"> = ["TODOS", "WEB", "MOVIL", "MENSAJERIA"];

const estadoTone: Record<EstadoIncidente, string> = {
  RECIBIDO: "bg-blue-50 text-blue-700",
  EN_EVALUACION: "bg-indigo-50 text-indigo-700",
  EN_ATENCION: "bg-amber-50 text-amber-700",
  ESCALADO: "bg-red-50 text-red-700",
  PENDIENTE_INFO: "bg-orange-50 text-orange-700",
  RESUELTO: "bg-green-50 text-green-700",
  CERRADO: "bg-slate-100 text-slate-700",
};

const severidadTone: Record<string, string> = {
  BAJO: "bg-green-50 text-green-700",
  MEDIO: "bg-amber-50 text-amber-700",
  ALTO: "bg-orange-50 text-orange-700",
  CRITICO: "bg-red-50 text-red-700",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function IncidentesPage() {
  const [items, setItems] = useState<IncidenteListItemApi[]>([]);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState<EstadoIncidente | "TODOS">("TODOS");
  const [canal, setCanal] = useState<TipoCanal | "TODOS">("TODOS");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activos = useMemo(
    () => items.filter((item) => !["RESUELTO", "CERRADO"].includes(item.estado)).length,
    [items],
  );
  const criticos = useMemo(
    () => items.filter((item) => item.severidad === "CRITICO").length,
    [items],
  );

  const loadIncidentes = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await incidentesApi.list({
        limit: 100,
        search: search.trim() || undefined,
        estado,
        canal_origen: canal,
      });
      setItems(response.items);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible cargar los incidentes",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadIncidentes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, canal]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Gestion de Incidentes</h1>
          <p className="text-sm text-muted-foreground">
            Expedientes unicos recibidos desde web, movil y mensajeria.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={loadIncidentes} disabled={loading}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button asChild className="bg-[#001C55] hover:bg-[#032E84]">
            <Link href="/reportar">
              <ShieldAlert className="mr-2 h-4 w-4" />
              Registrar incidente
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total visible</CardDescription>
            <CardTitle className="text-3xl">{items.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Activos</CardDescription>
            <CardTitle className="text-3xl">{activos}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Criticos</CardDescription>
            <CardTitle className="text-3xl">{criticos}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bandeja de incidentes</CardTitle>
          <CardDescription>
            Filtra por codigo, descripcion, estado o canal de origen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void loadIncidentes();
                }}
                className="pl-9"
                placeholder="Buscar por codigo, titulo o descripcion"
              />
            </div>
            <Select value={estado} onValueChange={(value) => setEstado(value as EstadoIncidente | "TODOS")}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {estados.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item === "TODOS" ? "Todos los estados" : item.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={canal} onValueChange={(value) => setCanal(value as TipoCanal | "TODOS")}>
              <SelectTrigger>
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                {canales.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item === "TODOS" ? "Todos los canales" : item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={loadIncidentes}>
              <Filter className="mr-2 h-4 w-4" />
              Filtrar
            </Button>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="overflow-hidden rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codigo</TableHead>
                  <TableHead>Incidente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Severidad</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead className="text-right">Accion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Cargando incidentes...
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No hay incidentes para los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs font-semibold">{item.codigo}</TableCell>
                      <TableCell>
                        <div className="max-w-xl">
                          <p className="font-medium text-slate-900">{item.titulo}</p>
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {item.zona ?? "Sin ubicacion textual"} · {item.reportante_nombre}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={estadoTone[item.estado]}>{item.estado.replaceAll("_", " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.severidad ? (
                          <Badge className={severidadTone[item.severidad]}>{item.severidad}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin clasificar</span>
                        )}
                      </TableCell>
                      <TableCell>{item.canal_origen}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(item.fecha_registro)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/incidentes/${item.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
