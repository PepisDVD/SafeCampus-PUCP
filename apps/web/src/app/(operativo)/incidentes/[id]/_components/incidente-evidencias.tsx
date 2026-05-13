import { ExternalLink, Paperclip } from "lucide-react";
import type { EvidenciaIncidenteItem } from "@safecampus/shared-types";

type Props = {
  evidencias: EvidenciaIncidenteItem[];
};

function formatBytes(bytes: number | null): string | null {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function IncidenteEvidencias({ evidencias }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <Paperclip className="h-5 w-5 text-[#001C55]" />
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
          Evidencias
        </h2>
      </div>

      {evidencias.length === 0 ? (
        <p className="text-sm text-slate-500">
          Aun no hay evidencias documentales asociadas a este incidente.
        </p>
      ) : (
        <div className="space-y-3">
          {evidencias.map((evidencia) => {
            const size = formatBytes(evidencia.tamano_bytes);
            return (
              <a
                key={evidencia.id}
                href={evidencia.url_archivo}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-[#001C55]/40 hover:bg-slate-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#001C55]/10 text-[#001C55]">
                  <Paperclip className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-900">
                    {evidencia.nombre_archivo}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {evidencia.tipo_archivo}
                    {size ? ` · ${size}` : ""}
                  </span>
                  {evidencia.descripcion && (
                    <span className="mt-1 block text-xs text-slate-600">
                      {evidencia.descripcion}
                    </span>
                  )}
                </span>
                <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}
