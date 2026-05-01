"use client";

import { useState, useTransition } from "react";
import {
  Button,
  Dialog,
  DialogContent,
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
import { crearUsuario, actualizarUsuario } from "../../actions/usuario.actions";
import type { UsuarioConRoles } from "../../services/usuario.service";
import type { RolConPermisos } from "../../services/rol.service";

type UsuarioFormProps = {
  open: boolean;
  onClose: () => void;
  roles: RolConPermisos[];
  usuario?: UsuarioConRoles;
};

export function UsuarioForm({
  open,
  onClose,
  roles,
  usuario,
}: UsuarioFormProps) {
  const isEditing = !!usuario;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      if (isEditing && usuario) {
        const result = await actualizarUsuario({
          id: usuario.id,
          nombre: fd.get("nombre") as string,
          apellido: fd.get("apellido") as string,
          codigo_institucional: fd.get("codigo_institucional") as string,
          departamento: fd.get("departamento") as string,
          rolId: fd.get("rolId") as string,
        });
        if (result.error) {
          setError(result.error);
        } else {
          onClose();
        }
      } else {
        const result = await crearUsuario({
          nombre: fd.get("nombre") as string,
          apellido: fd.get("apellido") as string,
          email: fd.get("email") as string,
          codigo_institucional: fd.get("codigo_institucional") as string,
          departamento: fd.get("departamento") as string,
          rolId: fd.get("rolId") as string,
        });
        if (result.error) {
          setError(result.error);
        } else {
          onClose();
        }
      }
    });
  };

  const firstRolId = usuario?.roles[0]?.id ?? "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar usuario" : "Nuevo usuario"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                name="nombre"
                required
                defaultValue={usuario?.nombre}
                placeholder="Nombre"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apellido">Apellido *</Label>
              <Input
                id="apellido"
                name="apellido"
                required
                defaultValue={usuario?.apellido}
                placeholder="Apellido"
              />
            </div>
          </div>

          {!isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo institucional *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="usuario@pucp.edu.pe"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="codigo_institucional">Código</Label>
              <Input
                id="codigo_institucional"
                name="codigo_institucional"
                defaultValue={usuario?.codigo_institucional ?? ""}
                placeholder="20XXXXXX"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="departamento">Departamento</Label>
              <Input
                id="departamento"
                name="departamento"
                defaultValue={usuario?.departamento ?? ""}
                placeholder="Facultad / Área"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rolId">Rol</Label>
            <Select name="rolId" defaultValue={firstRolId}>
              <SelectTrigger id="rolId">
                <SelectValue placeholder="Seleccionar rol..." />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-[#001C55] hover:bg-[#001C55]/90"
            >
              {isPending
                ? "Guardando..."
                : isEditing
                  ? "Guardar cambios"
                  : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
