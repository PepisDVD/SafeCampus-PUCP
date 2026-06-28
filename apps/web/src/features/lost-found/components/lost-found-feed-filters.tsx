"use client";

import { useState } from "react";
import {
  Button,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@safecampus/ui-kit";
import type { CategoriaLf, MetadatoCampoLf } from "../types";
import { emptyCommunityFilters, type CommunityFilters } from "./feed-filters";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: CommunityFilters;
  categorias: CategoriaLf[];
  onApply: (filters: CommunityFilters) => void;
};

const TODAS = "__TODAS__";
const TODOS = "__TODOS__";

/** Campos de metadato activos de una categoría, ordenados. */
function camposDeCategoria(categoria?: CategoriaLf | null): MetadatoCampoLf[] {
  const campos = categoria?.metadatos_schema?.campos ?? [];
  return campos.filter((campo) => campo.activo).sort((a, b) => a.orden - b.orden);
}

export function LostFoundFeedFilters({ open, onOpenChange, filters, categorias, onApply }: Props) {
  // Borrador local: solo se vuelca al feed cuando el usuario pulsa "Aplicar".
  const [draft, setDraft] = useState<CommunityFilters>(filters);
  // Resincroniza el borrador con los filtros vigentes al abrir el Drawer
  // (patrón recomendado de "ajustar estado en render", sin efectos).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(filters);
  }

  const patch = (partial: Partial<CommunityFilters>) => setDraft((current) => ({ ...current, ...partial }));
  const categoriaSel = categorias.find((c) => c.id === draft.categoria_id) ?? null;
  const campos = camposDeCategoria(categoriaSel);

  const handleCategoria = (value: string) => {
    // Al cambiar de categoría se descartan los metadatos previos (eran de otra).
    patch({ categoria_id: value === TODAS ? "" : value, metadatos: {} });
  };

  const setMetadato = (codigo: string, value: string) => {
    patch({ metadatos: { ...draft.metadatos, [codigo]: value } });
  };

  const apply = () => {
    onApply(draft);
    onOpenChange(false);
  };

  const clear = () => {
    // Conserva la búsqueda, el tiempo y la ubicación (filtros rápidos del feed).
    const reset: CommunityFilters = {
      ...emptyCommunityFilters,
      search: draft.search,
      timePreset: draft.timePreset,
      lat: draft.lat,
      lng: draft.lng,
      radio_km: draft.radio_km,
    };
    setDraft(reset);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[88vh]">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-hidden">
          <DrawerHeader className="text-left">
            <DrawerTitle>Más filtros</DrawerTitle>
            <DrawerDescription>Afina la búsqueda por tipo, categoría y características.</DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-2">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select
                value={draft.tipo || TODOS}
                onValueChange={(value) => patch({ tipo: value === TODOS ? "" : (value as CommunityFilters["tipo"]) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todos</SelectItem>
                  <SelectItem value="PERDIDO">Perdidos</SelectItem>
                  <SelectItem value="ENCONTRADO">Encontrados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select value={draft.categoria_id || TODAS} onValueChange={handleCategoria}>
                <SelectTrigger><SelectValue placeholder="Todas las categorías" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>Todas las categorías</SelectItem>
                  {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {campos.length > 0 && (
              <div className="space-y-3 rounded-lg border border-dashed bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-600">Detalles de {categoriaSel?.nombre}</p>
                {campos.map((campo) => (
                  <div key={campo.codigo} className="space-y-1.5">
                    <Label className="text-xs">{campo.etiqueta}</Label>
                    <Input
                      type={campo.tipo === "numero" ? "number" : "text"}
                      inputMode={campo.tipo === "numero" ? "numeric" : undefined}
                      value={draft.metadatos[campo.codigo] ?? ""}
                      placeholder={`Filtrar por ${campo.etiqueta.toLowerCase()}`}
                      onChange={(e) => setMetadato(campo.codigo, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Desde (evento)</Label>
                <Input type="date" value={draft.fecha_desde} onChange={(e) => patch({ fecha_desde: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Hasta (evento)</Label>
                <Input type="date" value={draft.fecha_hasta} onChange={(e) => patch({ fecha_hasta: e.target.value })} />
              </div>
            </div>
          </div>

          <DrawerFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={clear}>Limpiar</Button>
            <Button className="flex-1" onClick={apply}>Aplicar filtros</Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
