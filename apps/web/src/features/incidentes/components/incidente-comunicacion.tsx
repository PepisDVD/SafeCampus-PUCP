"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare, Send } from "lucide-react";
import type {
  ComentarioIncidenteItem,
  IncidenteDetail,
} from "@safecampus/shared-types";
import { Button, Checkbox, Label, Textarea, cn } from "@safecampus/ui-kit";

import { crearComentarioIncidente } from "@/features/incidentes/client";
import { getInitials } from "@/features/incidentes/presentation";

type IncidenteComunicacionProps = {
  incidente: IncidenteDetail;
  allowInternal?: boolean;
};

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-PE", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function MessageItem({ item }: { item: ComentarioIncidenteItem }) {
  const autor = item.autor?.nombre_completo ?? "Usuario";

  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        item.es_interno
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200 bg-white",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#001C55]/10 text-[10px] font-bold text-[#001C55]">
          {getInitials(autor)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-800">
            {autor}
          </p>
          <p className="text-[11px] text-slate-500">
            {formatFecha(item.created_at)}
          </p>
        </div>
        {item.es_interno && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            Interno
          </span>
        )}
      </div>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">
        {item.contenido}
      </p>
    </div>
  );
}

export function IncidenteComunicacion({
  incidente,
  allowInternal = false,
}: IncidenteComunicacionProps) {
  const router = useRouter();
  const [contenido, setContenido] = useState("");
  const [esInterno, setEsInterno] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSend = async () => {
    if (saving || contenido.trim().length < 2) return;
    setSaving(true);
    setError(null);
    try {
      await crearComentarioIncidente(incidente.id, {
        contenido: contenido.trim(),
        es_interno: allowInternal ? esInterno : false,
      });
      setContenido("");
      setEsInterno(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el mensaje.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-[#001C55]" />
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
          Comunicacion
        </h2>
      </div>

      <div className="space-y-3">
        {incidente.comentarios.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            Aun no hay mensajes asociados a este incidente.
          </p>
        ) : (
          incidente.comentarios.map((comentario) => (
            <MessageItem key={comentario.id} item={comentario} />
          ))
        )}
      </div>

      <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
        <Textarea
          rows={3}
          value={contenido}
          onChange={(event) => setContenido(event.target.value)}
          placeholder="Escribe un mensaje sobre el incidente..."
        />
        {allowInternal && (
          <Label className="flex items-center gap-2 text-xs text-slate-600">
            <Checkbox
              checked={esInterno}
              onCheckedChange={(value) => setEsInterno(value === true)}
            />
            Nota interna para el equipo operativo
          </Label>
        )}
        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}
        <Button
          type="button"
          onClick={onSend}
          disabled={saving || contenido.trim().length < 2}
          className="w-full gap-2 bg-[#001C55] hover:bg-[#032E84]"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Enviar mensaje
        </Button>
      </div>
    </section>
  );
}
