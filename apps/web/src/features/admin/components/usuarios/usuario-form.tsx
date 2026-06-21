"use client";

import { useTransition } from "react";
import {
  Button,
  Drawer,
  DrawerClose,
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
  formatRoleLabel,
} from "@safecampus/ui-kit";
import { toast } from "sonner";
import { crearUsuario } from "../../actions/usuario.actions";
import { EMAIL_DOMAIN_ERROR, isValidInstitutionalEmail } from "@/lib/email";
import type { RolConPermisos } from "../../services/rol.service";

type UsuarioFormProps = {
  open: boolean;
  onClose: () => void;
  roles: RolConPermisos[];
};

export function UsuarioForm({ open, onClose, roles }: UsuarioFormProps) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = (fd.get("email") as string)?.trim() ?? "";

    if (!isValidInstitutionalEmail(email)) {
      toast.warning(EMAIL_DOMAIN_ERROR);
      return;
    }

    startTransition(async () => {
      const result = await crearUsuario({
        nombre: fd.get("nombre") as string,
        apellido: fd.get("apellido") as string,
        email,
        codigo_institucional: fd.get("codigo_institucional") as string,
        departamento: fd.get("departamento") as string,
        rolId: fd.get("rolId") as string,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Usuario creado correctamente.");
        onClose();
      }
    });
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(v) => !v && onClose()}
      direction="right"
    >
      <DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-md!">
        <DrawerHeader className="border-b text-left">
          <DrawerTitle>Nuevo usuario</DrawerTitle>
          <DrawerDescription>
            Registra una cuenta con correo @pucp.edu.pe o @gmail.com.
          </DrawerDescription>
        </DrawerHeader>

        <form
          id="usuario-form"
          onSubmit={handleSubmit}
          className="flex-1 space-y-4 overflow-y-auto p-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input id="nombre" name="nombre" required placeholder="Nombre" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apellido">Apellido *</Label>
              <Input
                id="apellido"
                name="apellido"
                required
                placeholder="Apellido"
              />
            </div>
          </div>

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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="codigo_institucional">Código</Label>
              <Input
                id="codigo_institucional"
                name="codigo_institucional"
                placeholder="20XXXXXX"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="departamento">Departamento</Label>
              <Input
                id="departamento"
                name="departamento"
                placeholder="Facultad / Área"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rolId">Rol</Label>
            <Select name="rolId">
              <SelectTrigger id="rolId" className="w-full">
                <SelectValue placeholder="Seleccionar rol..." />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {formatRoleLabel(r.nombre)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </form>

        <DrawerFooter className="flex-row justify-end gap-2 border-t">
          <DrawerClose asChild>
            <Button type="button" variant="outline" disabled={isPending}>
              Cancelar
            </Button>
          </DrawerClose>
          <Button
            type="submit"
            form="usuario-form"
            disabled={isPending}
            className="bg-[#001C55] hover:bg-[#001C55]/90"
          >
            {isPending ? "Guardando..." : "Crear usuario"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
