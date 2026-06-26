"use client";

import { Input, Label } from "@safecampus/ui-kit";
import type { CategoriaLf, MetadatoCampoLf } from "../types";

/** Campos de metadatos activos de una categoría, ordenados por `orden`. */
export function activeMetadatoCampos(categoria?: CategoriaLf | null): MetadatoCampoLf[] {
  return (categoria?.metadatos_schema?.campos ?? [])
    .filter((campo) => campo.activo)
    .slice()
    .sort((a, b) => a.orden - b.orden);
}

/** Valores iniciales (string) a partir de un objeto de metadatos persistido. */
export function metadatosToValues(
  campos: MetadatoCampoLf[],
  metadatos?: Record<string, unknown> | null,
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const campo of campos) {
    const raw = metadatos?.[campo.codigo];
    values[campo.codigo] = raw === undefined || raw === null ? "" : String(raw);
  }
  return values;
}

/** Convierte los valores del formulario al payload de metadatos (tipado por campo). */
export function valuesToMetadatos(
  campos: MetadatoCampoLf[],
  values: Record<string, string>,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const campo of campos) {
    const value = (values[campo.codigo] ?? "").trim();
    if (!value) continue;
    out[campo.codigo] = campo.tipo === "numero" ? Number(value) : value;
  }
  return out;
}

/** Devuelve el primer error de validación de metadatos, o null. */
export function validateMetadatos(campos: MetadatoCampoLf[], values: Record<string, string>): string | null {
  for (const campo of campos) {
    const value = (values[campo.codigo] ?? "").trim();
    if (campo.requerido && !value) return `El campo "${campo.etiqueta}" es obligatorio.`;
    if (value && campo.tipo === "numero" && Number.isNaN(Number(value))) {
      return `El campo "${campo.etiqueta}" debe ser numérico.`;
    }
  }
  return null;
}

export function MetadatoFields({
  campos,
  values,
  onChange,
}: {
  campos: MetadatoCampoLf[];
  values: Record<string, string>;
  onChange: (codigo: string, value: string) => void;
}) {
  if (campos.length === 0) return null;
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <p className="text-xs font-medium text-slate-600">Detalles de la categoría</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {campos.map((campo) => (
          <div key={campo.codigo} className="space-y-1.5">
            <Label className="text-xs">
              {campo.etiqueta}
              {campo.requerido && <span className="text-rose-600"> *</span>}
            </Label>
            <Input
              type={campo.tipo === "numero" ? "number" : "text"}
              value={values[campo.codigo] ?? ""}
              onChange={(e) => onChange(campo.codigo, e.target.value)}
              placeholder={campo.etiqueta}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
