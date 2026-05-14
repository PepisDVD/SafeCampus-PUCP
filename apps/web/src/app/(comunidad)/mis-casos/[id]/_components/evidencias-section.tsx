"use client";

/**
 * 📁 apps/web/src/app/(comunidad)/mis-casos/[id]/_components/evidencias-section.tsx
 * 🎯 Sección de evidencias para la vista comunidad: lista imágenes adjuntas
 *    y permite subir una nueva foto desde el dispositivo.
 * 📦 Feature: Incidentes / Comunidad
 */

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImageIcon, Loader2, Paperclip, X } from "lucide-react";
import { Button } from "@safecampus/ui-kit";

import type { EvidenciaIncidenteItem } from "@safecampus/shared-types";
import { subirEvidencia } from "@/features/incidentes/client";

interface Props {
  incidenteId: string;
  evidencias: EvidenciaIncidenteItem[];
}

const MIME_ACEPTADOS = "image/jpeg,image/png,image/webp,image/gif,image/heic";

export function EvidenciasSection({ incidenteId, evidencias }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPreview({ file, url: URL.createObjectURL(file) });
  }

  function cancelar() {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setDescripcion("");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function enviar() {
    if (!preview) return;
    setSubiendo(true);
    setError(null);
    try {
      await subirEvidencia(incidenteId, preview.file, descripcion || undefined);
      cancelar();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
        Evidencias
      </h2>

      {/* Lista de evidencias existentes */}
      {evidencias.length > 0 ? (
        <ul className="mt-4 grid grid-cols-2 gap-3">
          {evidencias.map((ev) => (
            <li key={ev.id} className="overflow-hidden rounded-xl border border-slate-200">
              <a href={ev.url_archivo} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ev.url_archivo}
                  alt={ev.nombre_archivo}
                  className="h-28 w-full object-cover"
                />
              </a>
              <div className="px-2 py-1.5">
                <p className="truncate text-xs font-medium text-slate-700">
                  {ev.nombre_archivo}
                </p>
                {ev.descripcion && (
                  <p className="truncate text-xs text-slate-500">{ev.descripcion}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-400">
          Aún no hay fotos adjuntas a este reporte.
        </p>
      )}

      {/* Preview antes de enviar */}
      {preview && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.url}
              alt="preview"
              className="h-20 w-20 shrink-0 rounded-lg object-cover"
            />
            <div className="flex-1 space-y-2">
              <p className="truncate text-xs font-medium text-slate-700">
                {preview.file.name}
              </p>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción opcional..."
                maxLength={500}
                rows={2}
                className="w-full resize-none rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <button
              onClick={cancelar}
              className="shrink-0 text-slate-400 hover:text-slate-600"
              aria-label="Cancelar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={enviar}
              disabled={subiendo}
              className="flex-1 bg-[#001C55] text-white hover:bg-[#002a7a]"
            >
              {subiendo ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Paperclip className="mr-1.5 h-3.5 w-3.5" />
                  Adjuntar
                </>
              )}
            </Button>
            <Button size="sm" variant="outline" onClick={cancelar} disabled={subiendo}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Botón para seleccionar imagen */}
      {!preview && (
        <div className="mt-4">
          <input
            ref={inputRef}
            type="file"
            accept={MIME_ACEPTADOS}
            onChange={handleFileChange}
            className="hidden"
            id="evidencia-file-input"
          />
          <label
            htmlFor="evidencia-file-input"
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-[#001C55] hover:text-[#001C55]"
          >
            <Camera className="h-4 w-4" />
            Adjuntar foto como evidencia
          </label>
          <p className="mt-1.5 text-xs text-slate-400">
            <ImageIcon className="mr-0.5 inline h-3 w-3" />
            jpg, png, webp, gif · máx. 10 MB
          </p>
        </div>
      )}
    </section>
  );
}
