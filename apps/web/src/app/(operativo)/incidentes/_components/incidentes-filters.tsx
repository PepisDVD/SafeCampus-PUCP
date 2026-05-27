"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Search } from "lucide-react";
import { EstadoIncidente, NivelSeveridad } from "@safecampus/shared-types";
import {
  Checkbox,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
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

function MultiFilterDropdown<T extends string>({
  placeholder,
  options,
  selected,
  onChange,
  className,
}: {
  placeholder: string;
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (values: T[]) => void;
  className?: string;
}) {
  const toggle = (value: T) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  };

  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? placeholder)
        : `${selected.length} seleccionados`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-full border border-input bg-white px-4 text-sm shadow-xs transition-colors hover:bg-slate-50 focus:outline-none",
            selected.length > 0 && "border-[#001C55] text-[#001C55]",
            className,
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-1">
        {options.map((opt) => {
          const checked = selected.includes(opt.value);
          return (
            <div
              key={opt.value}
              role="button"
              onClick={() => toggle(opt.value)}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-slate-50"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => toggle(opt.value)}
                className="pointer-events-none"
              />
              <span className={cn(checked && "font-medium")}>{opt.label}</span>
              {checked && <Check className="ml-auto h-3.5 w-3.5 text-[#001C55]" />}
            </div>
          );
        })}
        {selected.length > 0 && (
          <>
            <div className="my-1 border-t" />
            <div
              role="button"
              onClick={() => onChange([])}
              className="cursor-pointer rounded-md px-3 py-2 text-xs text-slate-500 hover:bg-slate-50"
            >
              Limpiar selección
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          defaultValue={search}
          placeholder="Buscar por ID o título..."
          className="rounded-full bg-white pl-9"
          onChange={(e) => update("search", e.target.value || null)}
        />
      </div>

      <MultiFilterDropdown
        placeholder="Todas las severidades"
        options={SEVERIDADES}
        selected={severidades}
        onChange={(vals) => update("severidad", vals.length ? vals.join(",") : null)}
        className="sm:w-52"
      />

      {view !== "kanban" && (
        <MultiFilterDropdown
          placeholder="Todos los estados"
          options={ESTADOS}
          selected={estados}
          onChange={(vals) => update("estado", vals.length ? vals.join(",") : null)}
          className="sm:w-48"
        />
      )}
    </div>
  );
}
