"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Textarea,
  toast,
} from "@safecampus/ui-kit";
import { lostFoundClient } from "../client";
import { activeMetadatoCampos, MetadatoFields, metadatosToValues, validateMetadatos, valuesToMetadatos } from "./metadato-fields";
import type { CasoLfDetail, CategoriaLf } from "../types";

export function EditCaseModal({
  open,
  onOpenChange,
  caso,
  categorias,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caso: CasoLfDetail;
  categorias: CategoriaLf[];
  onSaved: (caso: CasoLfDetail) => void;
}) {
  const [titulo, setTitulo] = useState(caso.titulo);
  const [descripcion, setDescripcion] = useState(caso.descripcion);
  const [categoriaId, setCategoriaId] = useState(caso.categoria_id ?? "");
  const [lugar, setLugar] = useState(caso.lugar_referencia ?? "");
  const [fecha, setFecha] = useState(caso.fecha_evento ?? caso.created_at);
  const [metadatos, setMetadatos] = useState<Record<string, string>>(() =>
    metadatosToValues(activeMetadatoCampos(categorias.find((c) => c.id === (caso.categoria_id ?? ""))), caso.metadatos ?? {}),
  );
  const [isPending, startTransition] = useTransition();

  const campos = useMemo(
    () => activeMetadatoCampos(categorias.find((c) => c.id === categoriaId)),
    [categorias, categoriaId],
  );

  const onCategoria = (value: string) => {
    setCategoriaId(value);
    const nuevos = activeMetadatoCampos(categorias.find((c) => c.id === value));
    // Si vuelve a la categoría original conserva sus metadatos; si cambia, parte en limpio.
    setMetadatos(metadatosToValues(nuevos, value === caso.categoria_id ? (caso.metadatos ?? {}) : {}));
  };

  const submit = () => {
    if (titulo.trim().length < 3) { toast.error("El título debe tener al menos 3 caracteres."); return; }
    if (descripcion.trim().length < 10) { toast.error("La descripción debe tener al menos 10 caracteres."); return; }
    if (!categoriaId) { toast.error("Selecciona una categoría."); return; }
    if (lugar.trim().length < 3) { toast.error("Indica el lugar de referencia."); return; }
    if (!fecha || Number.isNaN(new Date(fecha).getTime())) { toast.error("Indica la fecha del evento."); return; }
    const metaError = validateMetadatos(campos, metadatos);
    if (metaError) { toast.error(metaError); return; }

    startTransition(async () => {
      try {
        const saved = await lostFoundClient.actualizarCaso(caso.id, {
          titulo,
          descripcion,
          categoria_id: categoriaId,
          lugar_referencia: lugar,
          fecha_evento: new Date(fecha).toISOString(),
          color_principal: caso.color_principal ?? undefined,
          marca: caso.marca ?? undefined,
          etiquetas: caso.etiquetas,
          contacto_info: caso.contacto_info ?? undefined,
          latitud: caso.latitud ?? null,
          longitud: caso.longitud ?? null,
          metadatos: valuesToMetadatos(campos, metadatos),
        });
        onSaved(saved);
        onOpenChange(false);
        toast.success("Hilo actualizado");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo actualizar el hilo");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-4 text-left">
          <DialogTitle>Editar hilo</DialogTitle>
          <DialogDescription>Actualiza los datos descriptivos de la publicación.</DialogDescription>
        </DialogHeader>
        <div className="grid flex-1 gap-3 overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-titulo">Título</Label>
            <Input id="edit-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-descripcion">Descripción</Label>
            <Textarea id="edit-descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select value={categoriaId || undefined} onValueChange={onCategoria}>
              <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
              <SelectContent>
                {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-fecha">Fecha del evento</Label>
            <Input
              id="edit-fecha"
              type="datetime-local"
              value={toDateTimeLocalValue(fecha)}
              onChange={(e) => setFecha(fromDateTimeLocalValue(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-lugar">Lugar de referencia</Label>
            <Input id="edit-lugar" value={lugar} onChange={(e) => setLugar(e.target.value)} />
          </div>
          <MetadatoFields campos={campos} values={metadatos} onChange={(c, v) => setMetadatos((prev) => ({ ...prev, [c]: v }))} />
        </div>
        <DialogFooter className="shrink-0 gap-2 border-t bg-white px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function toDateTimeLocalValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(value: string) {
  return value ? new Date(value).toISOString() : "";
}
