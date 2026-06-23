"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Copy } from "lucide-react";
import { toast } from "@safecampus/ui-kit";
import { crearUsuario } from "../../actions/usuario.actions";
import { EMAIL_DOMAIN_ERROR, isPucpEmail, isValidInstitutionalEmail } from "@/lib/email";
import type { RolConPermisos } from "../../services/rol.service";

type UsuarioFormProps = {
  open: boolean;
  onClose: () => void;
  roles: RolConPermisos[];
};

type PasswordMode = "auto" | "manual";

export function UsuarioForm({ open, onClose, roles }: UsuarioFormProps) {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [asignarCredenciales, setAsignarCredenciales] = useState(false);
  const [passwordMode, setPasswordMode] = useState<PasswordMode>("auto");
  const [password, setPassword] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  // Las cuentas institucionales se autentican por SSO: no admiten contraseña.
  const institutional = useMemo(() => isPucpEmail(email), [email]);
  const credencialesHabilitadas = asignarCredenciales && !institutional;

  const resetForm = () => {
    setEmail("");
    setAsignarCredenciales(false);
    setPasswordMode("auto");
    setPassword("");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const trimmedEmail = email.trim();

    if (!isValidInstitutionalEmail(trimmedEmail)) {
      toast.warning(EMAIL_DOMAIN_ERROR);
      return;
    }

    if (credencialesHabilitadas && passwordMode === "manual" && !password.trim()) {
      toast.warning("Ingresa una contraseña o usa la opción autogenerada.");
      return;
    }

    startTransition(async () => {
      const result = await crearUsuario({
        nombre: fd.get("nombre") as string,
        apellido: fd.get("apellido") as string,
        email: trimmedEmail,
        codigo_institucional: fd.get("codigo_institucional") as string,
        departamento: fd.get("departamento") as string,
        rolId: fd.get("rolId") as string,
        password:
          credencialesHabilitadas && passwordMode === "manual"
            ? password.trim()
            : null,
        generarPassword: credencialesHabilitadas && passwordMode === "auto",
      });
      if (result.error) {
        toast.error(result.error);
      } else if (result.passwordGenerada) {
        // Se muestra UNA sola vez al admin para que la comparta.
        setGeneratedPassword(result.passwordGenerada);
        toast.success("Usuario creado con credenciales.");
        resetForm();
      } else {
        toast.success("Usuario creado correctamente.");
        resetForm();
        onClose();
      }
    });
  };

  const handleCopyPassword = async () => {
    if (!generatedPassword) return;
    try {
      await navigator.clipboard.writeText(generatedPassword);
      toast.success("Contraseña copiada al portapapeles.");
    } catch {
      toast.error("No se pudo copiar la contraseña.");
    }
  };

  return (
    <>
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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

            {/* Credenciales: solo cuentas NO institucionales (las @pucp usan SSO). */}
            {institutional ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
                Las cuentas @pucp.edu.pe se autentican con SSO institucional y no
                requieren contraseña.
              </p>
            ) : (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="asignar-credenciales"
                    checked={asignarCredenciales}
                    onCheckedChange={(v) => setAsignarCredenciales(Boolean(v))}
                  />
                  <Label
                    htmlFor="asignar-credenciales"
                    className="text-sm leading-snug font-normal"
                  >
                    Asignar credenciales de acceso (cuenta no institucional)
                  </Label>
                </div>

                {asignarCredenciales && (
                  <div className="space-y-3 pl-0.5">
                    <div className="space-y-1.5">
                      <Label>Contraseña</Label>
                      <Select
                        value={passwordMode}
                        onValueChange={(v) => setPasswordMode(v as PasswordMode)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Autogenerar</SelectItem>
                          <SelectItem value="manual">Manual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {passwordMode === "manual" && (
                      <div className="space-y-1.5">
                        <Label htmlFor="password-manual">Contraseña manual</Label>
                        <Input
                          id="password-manual"
                          type="password"
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Mínimo 8 caracteres"
                        />
                      </div>
                    )}

                    {passwordMode === "auto" && (
                      <p className="text-xs text-muted-foreground">
                        Se generará una contraseña segura que se mostrará una sola
                        vez al crear la cuenta.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
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

      {/* Contraseña autogenerada: visible una sola vez. */}
      <Dialog
        open={Boolean(generatedPassword)}
        onOpenChange={(v) => {
          if (!v) {
            setGeneratedPassword(null);
            onClose();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Credenciales generadas</DialogTitle>
            <DialogDescription>
              Comparte esta contraseña con el usuario por un canal seguro. No
              volverá a mostrarse.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg border bg-slate-50 p-3">
            <code className="flex-1 font-mono text-sm break-all">
              {generatedPassword}
            </code>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCopyPassword}
              aria-label="Copiar contraseña"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setGeneratedPassword(null);
                onClose();
              }}
              className="bg-[#001C55] hover:bg-[#001C55]/90"
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
