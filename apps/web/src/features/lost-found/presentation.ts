import type { EstadoCasoLF, TipoCasoLF } from "@safecampus/shared-types";

export const estadoLfTone: Record<string, string> = {
  ABIERTO: "bg-emerald-50 text-emerald-700 border-emerald-200",
  EN_REVISION: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMADO: "bg-orange-50 text-orange-700 border-orange-200",
  EN_CUSTODIA: "bg-sky-50 text-sky-700 border-sky-200",
  DEVUELTO: "bg-teal-50 text-teal-700 border-teal-200",
  DESCARTADO: "bg-rose-50 text-rose-700 border-rose-200",
  CERRADO: "bg-slate-100 text-slate-600 border-slate-200",
};

export function tipoLabel(tipo: TipoCasoLF | string) {
  return tipo === "PERDIDO" ? "Perdido" : "Encontrado";
}

export function estadoLabel(estado: EstadoCasoLF | string) {
  return estado.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}
