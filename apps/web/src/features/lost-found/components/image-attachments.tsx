"use client";

import { useState, type ChangeEvent } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  toast,
} from "@safecampus/ui-kit";
import { Eye, Trash2 } from "lucide-react";

export type FotoAdjunta = {
  file: File;
  previewUrl: string;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/gif";

export function makeFoto(file: File): FotoAdjunta {
  return { file, previewUrl: URL.createObjectURL(file) };
}

export function revokeFotos(fotos: FotoAdjunta[]) {
  fotos.forEach((foto) => URL.revokeObjectURL(foto.previewUrl));
}

/**
 * Carga de imagenes que acumula hasta `max` archivos (no reemplaza), con
 * previsualizacion y eliminacion individual. Replica el comportamiento del
 * formulario de creacion de hilos (lost-found-threads.tsx).
 */
export function ImageAttachments({
  id,
  label,
  value,
  onChange,
  max = 3,
  helperText,
}: {
  id: string;
  label: string;
  value: FotoAdjunta[];
  onChange: (next: FotoAdjunta[]) => void;
  max?: number;
  helperText?: string;
}) {
  const [preview, setPreview] = useState<FotoAdjunta | null>(null);
  const canAdd = value.length < max;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    const images = selected.filter((file) => file.type.startsWith("image/"));
    if (images.length !== selected.length) {
      toast.error("Solo se permiten archivos de imagen.");
    }
    if (images.length === 0) {
      event.target.value = "";
      return;
    }
    const additions = images.map(makeFoto);
    const combined = [...value, ...additions];
    if (combined.length > max) {
      toast.error(`Solo puedes adjuntar hasta ${max} fotos.`);
      revokeFotos(combined.slice(max));
    }
    onChange(combined.slice(0, max));
    event.target.value = "";
  };

  const remove = (index: number) => {
    const target = value[index];
    if (target) URL.revokeObjectURL(target.previewUrl);
    onChange(value.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label} (max. {max})</Label>
      <Input
        id={id}
        type="file"
        multiple
        accept={ACCEPT}
        disabled={!canAdd}
        onChange={handleChange}
      />
      {helperText && <p className="text-xs text-slate-500">{helperText}</p>}
      {!canAdd && <p className="text-xs text-amber-600">Ya alcanzaste el maximo de {max} fotos.</p>}
      {value.length > 0 && (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <p className="text-xs font-medium text-slate-600">Adjuntos seleccionados ({value.length})</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {value.map((foto, index) => (
              <AttachmentPreviewCard
                key={`${foto.file.name}-${index}`}
                foto={foto}
                onPreview={() => setPreview(foto)}
                onRemove={() => remove(index)}
              />
            ))}
          </div>
        </div>
      )}
      <AttachmentPreviewDialog foto={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

/**
 * Carga de una sola imagen con previsualizacion. Pensado para evidencias que
 * admiten un unico archivo (firma, foto, constancia).
 */
export function SingleImageAttachment({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: FotoAdjunta | null;
  onChange: (next: FotoAdjunta | null) => void;
}) {
  const [preview, setPreview] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten archivos de imagen.");
      event.target.value = "";
      return;
    }
    if (value) URL.revokeObjectURL(value.previewUrl);
    onChange(makeFoto(file));
    event.target.value = "";
  };

  const remove = () => {
    if (value) URL.revokeObjectURL(value.previewUrl);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {value ? (
        <div className="max-w-[200px]">
          <AttachmentPreviewCard foto={value} onPreview={() => setPreview(true)} onRemove={remove} />
        </div>
      ) : (
        <Input id={id} type="file" accept={ACCEPT} onChange={handleChange} />
      )}
      <AttachmentPreviewDialog foto={value && preview ? value : null} onClose={() => setPreview(false)} />
    </div>
  );
}

function AttachmentPreviewCard({
  foto,
  onPreview,
  onRemove,
}: {
  foto: FotoAdjunta;
  onPreview: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border bg-white p-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={foto.previewUrl} alt={foto.file.name} className="h-20 w-full rounded object-cover" />
      <p className="mt-2 truncate text-[11px] text-slate-600">{foto.file.name}</p>
      <div className="mt-2 grid grid-cols-2 gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 w-full p-0"
          aria-label="Ver imagen adjunta"
          title="Ver imagen"
          onClick={onPreview}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 w-full p-0 text-rose-600"
          aria-label="Quitar imagen adjunta"
          title="Quitar imagen"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function AttachmentPreviewDialog({ foto, onClose }: { foto: FotoAdjunta | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(foto)} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{foto?.file.name ?? "Vista previa"}</DialogTitle>
        </DialogHeader>
        {foto && (
          <div className="rounded-lg border bg-slate-50 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto.previewUrl} alt={foto.file.name} className="max-h-[70vh] w-full rounded object-contain" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
