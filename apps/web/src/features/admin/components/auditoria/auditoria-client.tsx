"use client";

import React, { useMemo, useState } from "react";
import {
  Badge,
  FilterBar,
  MultiSelectFilter,
  SearchInput,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@safecampus/ui-kit";
import { ChevronDown, ChevronRight, ClipboardList } from "lucide-react";
import type { RegistroAuditoria } from "../../services/auditoria.service";

type AuditoriaClientProps = {
  initialLogs: RegistroAuditoria[];
  modulos: string[];
};

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function AuditoriaClient({ initialLogs, modulos }: AuditoriaClientProps) {
  const [search, setSearch] = useState("");
  const [moduloFilters, setModuloFilters] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return initialLogs.filter((log) => {
      const usuario = asRecord(log.usuario);
      const matchesSearch =
        !term ||
        asText(log.modulo).toLowerCase().includes(term) ||
        asText(log.accion).toLowerCase().includes(term) ||
        asText(log.entidad).toLowerCase().includes(term) ||
        asText(log.entidad_id).toLowerCase().includes(term) ||
        asText(usuario?.nombre_completo).toLowerCase().includes(term) ||
        asText(usuario?.email).toLowerCase().includes(term);

      const matchesModulo =
        moduloFilters.length === 0 || moduloFilters.includes(asText(log.modulo));

      return matchesSearch && matchesModulo;
    });
  }, [initialLogs, search, moduloFilters]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;

    const limaDate = new Date(date.getTime() - 5 * 60 * 60 * 1000);
    const months = [
      "ene.",
      "feb.",
      "mar.",
      "abr.",
      "may.",
      "jun.",
      "jul.",
      "ago.",
      "set.",
      "oct.",
      "nov.",
      "dic.",
    ];
    const day = String(limaDate.getUTCDate()).padStart(2, "0");
    const month = months[limaDate.getUTCMonth()];
    const year = limaDate.getUTCFullYear();
    const hour = String(limaDate.getUTCHours()).padStart(2, "0");
    const minute = String(limaDate.getUTCMinutes()).padStart(2, "0");

    return `${day} ${month} ${year}, ${hour}:${minute}`;
  };

  const accionColor = (accion: string) => {
    const a = accion.toLowerCase();
    if (a.includes("crear") || a.includes("registrar") || a.includes("alta")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (a.includes("eliminar") || a.includes("suspender") || a.includes("revocar")) {
      return "bg-red-50 text-red-700 border-red-200";
    }
    if (
      a.includes("editar") ||
      a.includes("actualizar") ||
      a.includes("modificar") ||
      a.includes("cambiar") ||
      a.includes("asignar")
    ) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  const formatAccion = (accion: string) =>
    accion.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

  const getEntidadLabel = (log: RegistroAuditoria) => {
    const detalle = asRecord(log.detalle);
    const codigo = asText(detalle?.codigo);
    const entidad = asText(log.entidad).replace(/_/g, " ") || null;
    if (codigo) return `${entidad ?? "Entidad"} ${codigo}`;
    if (!entidad) return null;
    const entidadId = asText(log.entidad_id);
    return `${entidad} ${entidadId ? `#${entidadId.slice(0, 8)}` : ""}`.trim();
  };

  const getUsuario = (log: RegistroAuditoria) => {
    const usuario = asRecord(log.usuario);
    if (!usuario) return null;
    const nombre = asText(usuario.nombre_completo) || "Usuario";
    const email = asText(usuario.email);
    return { nombre, email };
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Log de Auditoría
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Registro centralizado de todas las acciones del sistema
        </p>
      </div>

      <FilterBar className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          containerClassName="flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por módulo, acción, entidad o usuario..."
        />
        <MultiSelectFilter
          className="w-full sm:w-52"
          placeholder="Todos los módulos"
          options={modulos.map((modulo) => ({
            value: asText(modulo),
            label: asText(modulo).replace(/_/g, " "),
          }))}
          selected={moduloFilters}
          onChange={setModuloFilters}
        />
      </FilterBar>

      <div className="overflow-hidden rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-8" />
              <TableHead>Fecha y hora</TableHead>
              <TableHead>Módulo</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Entidad</TableHead>
              <TableHead>Usuario</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <ClipboardList className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    No hay eventos de auditoria que coincidan con los filtros.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((log) => {
                const usuario = getUsuario(log);
                const entidadLabel = getEntidadLabel(log);
                const modulo = asText(log.modulo);
                const accion = asText(log.accion);
                const usuarioId = asText(log.usuario_id);

                return (
                <React.Fragment key={asText(log.id)}>
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
                    <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                      {formatDate(asText(log.fecha_registro))}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {modulo.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${accionColor(accion)}`}
                      >
                        {formatAccion(accion)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {entidadLabel ? (
                        <span className="capitalize">{entidadLabel}</span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {usuario ? (
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-700">
                            {usuario.nombre}
                          </p>
                          {usuario.email && (
                            <p className="truncate text-xs text-muted-foreground">
                              {usuario.email}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {usuarioId ? `${usuarioId.slice(0, 8)}...` : "-"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedId === log.id && log.detalle && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-slate-50 px-8 py-3">
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                          Detalle del evento:
                        </p>
                        <pre className="max-h-40 overflow-auto rounded-md border bg-white p-3 text-xs">
                          {JSON.stringify(log.detalle, null, 2)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-right text-xs text-muted-foreground">
        Mostrando {filtered.length} de {initialLogs.length} registros (ultimos 100)
      </p>
    </div>
  );
}
