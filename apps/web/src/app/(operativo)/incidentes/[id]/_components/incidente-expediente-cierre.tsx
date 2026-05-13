import { FileCheck2 } from "lucide-react";
import type { ExpedienteCierre } from "@safecampus/shared-types";

type Props = {
  expediente: ExpedienteCierre | null;
};

function formatFecha(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("es-PE", {
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function IncidenteExpedienteCierre({ expediente }: Props) {
  if (!expediente) {
    return null;
  }

  return (
    <section className="rounded-lg border border-emerald-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <FileCheck2 className="h-5 w-5 text-emerald-700" />
        <h2 className="text-sm font-semibold tracking-wide text-slate-700 uppercase">
          Expediente de cierre
        </h2>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium text-slate-500">Resumen final</p>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">
            {expediente.resumen_cierre}
          </p>
        </div>

        {expediente.resultado && (
          <div>
            <p className="text-xs font-medium text-slate-500">Resultado</p>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">
              {expediente.resultado}
            </p>
          </div>
        )}

        <div className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-slate-500">Generado por</p>
            <p className="text-sm font-semibold text-slate-900">
              {expediente.generado_por?.nombre_completo ?? "Usuario"}
            </p>
            {expediente.generado_por?.email && (
              <p className="text-xs text-slate-500">
                {expediente.generado_por.email}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Fecha de cierre</p>
            <p className="text-sm font-semibold text-slate-900">
              {formatFecha(expediente.created_at)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
