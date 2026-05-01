"use client";

import React, { useState, useMemo } from "react";
import {
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
  Badge,
} from "@safecampus/ui-kit";
import { Search, ChevronDown, ChevronRight, ClipboardList } from "lucide-react";
import type { RegistroAuditoria } from "../../services/auditoria.service";

type AuditoriaClientProps = {
  initialLogs: RegistroAuditoria[];
  modulos: string[];
};

export function AuditoriaClient({ initialLogs, modulos }: AuditoriaClientProps) {
  const [search, setSearch] = useState("");
  const [moduloFilter, setModuloFilter] = useState("todos");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return initialLogs.filter((log) => {
      const matchesSearch =
        !term ||
        log.modulo.toLowerCase().includes(term) ||
        log.accion.toLowerCase().includes(term) ||
        (log.entidad ?? "").toLowerCase().includes(term) ||
        (log.entidad_id ?? "").toLowerCase().includes(term);

      const matchesModulo =
        moduloFilter === "todos" || log.modulo === moduloFilter;

      return matchesSearch && matchesModulo;
    });
  }, [initialLogs, search, moduloFilter]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const accionColor = (accion: string) => {
    const a = accion.toLowerCase();
    if (a.includes("crear") || a.includes("registrar") || a.includes("alta")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (a.includes("eliminar") || a.includes("suspender") || a.includes("revocar")) return "bg-red-50 text-red-700 border-red-200";
    if (a.includes("editar") || a.includes("actualizar") || a.includes("modificar")) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Log de Auditoría
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Registro centralizado de todas las acciones del sistema
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por módulo, acción o entidad..."
            className="pl-9"
          />
        </div>
        <Select value={moduloFilter} onValueChange={setModuloFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Módulo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los módulos</SelectItem>
            {modulos.map((m) => (
              <SelectItem key={m} value={m} className="capitalize">
                {m.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-8" />
              <TableHead>Fecha y hora</TableHead>
              <TableHead>Módulo</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Entidad</TableHead>
              <TableHead>Usuario ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center"
                >
                  <ClipboardList className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    No hay eventos de auditoría que coincidan con los filtros.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((log) => (
                <React.Fragment key={log.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() =>
                      setExpandedId(expandedId === log.id ? null : log.id)
                    }
                  >
                    <TableCell className="text-muted-foreground">
                      {expandedId === log.id ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(log.fecha_registro)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {log.modulo.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${accionColor(log.accion)}`}
                      >
                        {log.accion}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.entidad ? (
                        <span className="capitalize">
                          {log.entidad}{" "}
                          {log.entidad_id && (
                            <span className="text-muted-foreground text-xs">
                              #{log.entidad_id.slice(0, 8)}
                            </span>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.usuario_id ? log.usuario_id.slice(0, 8) + "..." : "—"}
                    </TableCell>
                  </TableRow>
                  {expandedId === log.id && log.detalle && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-slate-50 px-8 py-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Detalle del evento:
                        </p>
                        <pre className="text-xs rounded-md bg-white border p-3 overflow-auto max-h-40">
                          {JSON.stringify(log.detalle, null, 2)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground text-right">
        Mostrando {filtered.length} de {initialLogs.length} registros (últimos 100)
      </p>
    </div>
  );
}
