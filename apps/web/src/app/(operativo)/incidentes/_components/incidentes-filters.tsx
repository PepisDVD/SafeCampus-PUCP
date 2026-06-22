"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EstadoIncidente, NivelSeveridad } from "@safecampus/shared-types";
import {
  FilterBar,
  MultiSelectFilter,
  SearchInput,
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

type Props = {
  search: string;
  severidades: NivelSeveridad[];
  estados: EstadoIncidente[];
  view?: "tabla" | "kanban";
};

export function IncidentesFilters({ search, severidades, estados, view }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const update = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <FilterBar className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <SearchInput
        containerClassName="flex-1"
        defaultValue={search}
        placeholder="Buscar por ID o título..."
        onChange={(e) => update("search", e.target.value || null)}
      />

      <MultiSelectFilter
        placeholder="Todas las severidades"
        options={SEVERIDADES}
        selected={severidades}
        onChange={(vals) => update("severidad", vals.length ? vals.join(",") : null)}
        className="sm:w-52"
      />

      {view !== "kanban" && (
        <MultiSelectFilter
          placeholder="Todos los estados"
          options={ESTADOS}
          selected={estados}
          onChange={(vals) => update("estado", vals.length ? vals.join(",") : null)}
          className="sm:w-48"
        />
      )}
    </FilterBar>
  );
}
