/**
 * 📁 apps/web/src/features/usuarios/components/usuario-form-dialog.tsx
 * 🎯 Diálogo de creación/edición de usuario con validación Zod (UC-GU-02/03).
 *    Valida correo institucional @pucp.edu.pe y unicidad vía callbacks del store.
 * 📦 Feature: Usuarios
 */

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
} from "@safecampus/ui-kit";

import { ESTADO_LABELS, ESTADOS, ROL_LABELS, ROLES } from "@/constants/roles";
import type { EstadoUsuario, RolUsuario } from "@/constants/roles";

import type {
  CrearUsuarioInput,
  EditarUsuarioInput,
  UsuarioAdmin,
} from "../types";

export const usuarioBaseSchema = z.object({
  nombre: z.string().trim().min(3, "Ingresa el nombre completo."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Correo inválido.")
    .refine((v) => v.endsWith("@pucp.edu.pe"), {
      message: "Debe ser un correo institucional @pucp.edu.pe.",
    }),
  codigo: z.string().trim().min(3, "Código requerido."),
  departamento: z.string().trim().min(2, "Departamento requerido."),
  rol: z.enum(ROLES as [RolUsuario, ...RolUsuario[]]),
});

export const usuarioCrearSchema = usuarioBaseSchema;
export const usuarioEditarSchema = usuarioBaseSchema.extend({
  estado: z.enum(ESTADOS as [EstadoUsuario, ...EstadoUsuario[]]),
});

type CrearForm = z.infer<typeof usuarioCrearSchema>;
type EditarForm = z.infer<typeof usuarioEditarSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modo: "crear" | "editar";
  usuario?: UsuarioAdmin;
  onCrear?: (input: CrearUsuarioInput) => Promise<{ ok: boolean; mensaje?: string }>;
  onEditar?: (id: string, input: EditarUsuarioInput) => Promise<{ ok: boolean; mensaje?: string }>;
}

const valoresVaciosCrear: CrearForm = {
  nombre: "",
  email: "",
  codigo: "",
  departamento: "",
  rol: "comunidad",
};

export function UsuarioFormDialog({
  open,
  onOpenChange,
  modo,
  usuario,
  onCrear,
  onEditar,
}: Props) {
  const esEditar = modo === "editar";
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CrearForm | EditarForm>({
    resolver: zodResolver(esEditar ? usuarioEditarSchema : usuarioCrearSchema),
    defaultValues: esEditar && usuario
      ? {
          nombre: usuario.nombre,
          email: usuario.email,
          codigo: usuario.codigo,
          departamento: usuario.departamento,
          rol: usuario.rol,
          estado: usuario.estado,
        }
      : valoresVaciosCrear,
  });

  useEffect(() => {
    if (!open) return;
    if (esEditar && usuario) {
      form.reset({
        nombre: usuario.nombre,
        email: usuario.email,
        codigo: usuario.codigo,
        departamento: usuario.departamento,
        rol: usuario.rol,
        estado: usuario.estado,
      });
    } else {
      form.reset(valoresVaciosCrear);
    }
  }, [esEditar, open, usuario, form]);

  const valores = form.watch();

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      if (esEditar && usuario && onEditar) {
        const result = await onEditar(usuario.id, values as EditarUsuarioInput);
        if (!result.ok) {
          toast.error(result.mensaje ?? "No se pudo actualizar el usuario.");
          return;
        }
        toast.success("Usuario actualizado correctamente.");
      } else if (!esEditar && onCrear) {
        const result = await onCrear(values as CrearUsuarioInput);
        if (!result.ok) {
          toast.error(result.mensaje ?? "No se pudo crear el usuario.");
          return;
        }
        toast.success("Usuario creado correctamente.");
      }
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {esEditar ? "Editar usuario" : "Crear nuevo usuario"}
          </DialogTitle>
          <DialogDescription>
            {esEditar
              ? "Actualiza los datos de la cuenta. Los cambios quedarán registrados en auditoría."
              : "Completa los datos para dar de alta una cuenta con acceso al sistema."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1">
            <Label htmlFor="nombre">Nombre completo</Label>
            <Input
              id="nombre"
              autoComplete="name"
              {...form.register("nombre")}
              disabled={submitting}
            />
            {form.formState.errors.nombre && (
              <p className="text-xs text-red-600">{form.formState.errors.nombre.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="email">Correo institucional</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@pucp.edu.pe"
                autoComplete="email"
                {...form.register("email")}
                disabled={submitting}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                placeholder="20201234 / OP-023"
                {...form.register("codigo")}
                disabled={submitting}
              />
              {form.formState.errors.codigo && (
                <p className="text-xs text-red-600">{form.formState.errors.codigo.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="departamento">Departamento / unidad</Label>
            <Input
              id="departamento"
              placeholder="Ingeniería Informática"
              {...form.register("departamento")}
              disabled={submitting}
            />
            {form.formState.errors.departamento && (
              <p className="text-xs text-red-600">
                {form.formState.errors.departamento.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Rol</Label>
              <Select
                value={valores.rol}
                onValueChange={(v) => form.setValue("rol", v as RolUsuario, { shouldDirty: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROL_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {esEditar && (
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select
                  value={(valores as EditarForm).estado}
                  onValueChange={(v) =>
                    form.setValue("estado", v as EstadoUsuario, { shouldDirty: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS.map((e) => (
                      <SelectItem key={e} value={e}>
                        {ESTADO_LABELS[e]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Guardando..." : esEditar ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
