/**
 * 📁 apps/web/src/app/(operativo)/incidentes/_components/incidentes-filters.tsx
 * 🎯 Barra de búsqueda + filtros de severidad/estado para la tabla operativa.
 *    Sincroniza el estado con la URL para que el Server Component re-renderice.
 * 📦 Módulo: Operativo / Incidentes
 */

"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { EstadoIncidente, NivelSeveridad } from "@safecampus/shared-types";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@safecampus/ui-kit";

const SEVERIDADES: { value: NivelSeveridad; label: string }[] = [
  { value: NivelSeveridad.CRITICO, label: "Crítico" },
  { value: NivelSeveridad.ALTO, label: "Alto" },
  { value: NivelSeveridad.MEDIO, label: "Medio" },
  { value: NivelSeveridad.BAJO, label: "Bajo" },
];

const ESTADOS: { value: EstadoIncidente; label: string }[] = [
  { value: EstadoIncidente.RECIBIDO, label: "Nuevo" },
  { value: EstadoIncidente.EN_EVALUACION, label: "En evaluación" },
  { value: EstadoIncidente.EN_ATENCION, label: "En atención" },
  { value: EstadoIncidente.ESCALADO, label: "Escalado" },
  { value: EstadoIncidente.PENDIENTE_INFO, label: "Pendiente" },
  { value: EstadoIncidente.RESUELTO, label: "Resuelto" },
  { value: EstadoIncidente.CERRADO, label: "Cerrado" },
];

const ALL = "__all__";

type Props = {
  search: string;
  severidad: NivelSeveridad | null;
  estado: EstadoIncidente | null;
};

export function IncidentesFilters({ search, severidad, estado }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const update = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== ALL) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          defaultValue={search}
          placeholder="Buscar por ID o título..."
          className="rounded-full bg-white pl-9"
          onChange={(event) => update("search", event.target.value || null)}
        />
      </div>

      <Select
        value={severidad ?? ALL}
        onValueChange={(v) => update("severidad", v === ALL ? null : v)}
      >
        <SelectTrigger className="w-full rounded-full bg-white sm:w-48">
          <SelectValue placeholder="Todas las severidades" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas las severidades</SelectItem>
          {SEVERIDADES.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={estado ?? ALL}
        onValueChange={(v) => update("estado", v === ALL ? null : v)}
      >
        <SelectTrigger className="w-full rounded-full bg-white sm:w-44">
          <SelectValue placeholder="Todos los estados" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos los estados</SelectItem>
          {ESTADOS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}