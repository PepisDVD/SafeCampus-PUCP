"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  RoleBadge,
} from "@safecampus/ui-kit";
import { Building2, IdCard, Lock, Mail, Pencil, Phone, Save, UserCircle2 } from "lucide-react";
import { toast } from "sonner";

import { updateCurrentProfile } from "@/lib/auth";
import { isPucpEmail } from "@/lib/email";

export type ProfileFormValues = {
  nombre: string;
  apellido: string;
  telefono: string;
  departamento: string;
};

type ProfilePageClientProps = {
  profile: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    codigoInstitucional: string | null;
    telefono: string | null;
    departamento: string | null;
    roles: string[];
  };
  readOnly?: boolean;
  onSave?: (values: ProfileFormValues) => Promise<{ error?: string }>;
  /** Acciones extra mostradas en la cabecera (p. ej. suspender/reactivar). */
  headerActions?: React.ReactNode;
};

export function ProfilePageClient({
  profile,
  readOnly = false,
  onSave,
  headerActions,
}: ProfilePageClientProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(!readOnly);
  const [form, setForm] = useState<ProfileFormValues>({
    nombre: profile.nombre,
    apellido: profile.apellido,
    telefono: profile.telefono ?? "",
    departamento: profile.departamento ?? "",
  });
  const isFormReadOnly = readOnly && !isEditing;
  // Identidad provista por la PUCP: nombre y apellido no son editables.
  const identityLocked = isPucpEmail(profile.email);

  const fullName = useMemo(
    () => `${form.nombre} ${form.apellido}`.trim() || profile.email,
    [form.apellido, form.nombre, profile.email],
  );

  const initials = useMemo(() => {
    return fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }, [fullName]);

  const onChange = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const normalized = {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        telefono: form.telefono.trim(),
        departamento: form.departamento.trim(),
      };
      if (onSave) {
        const result = await onSave(normalized);
        if (result.error) throw new Error(result.error);
      } else {
        await updateCurrentProfile({
          ...normalized,
          telefono: normalized.telefono || null,
          departamento: normalized.departamento || null,
        });
      }
      setForm(normalized);
      if (readOnly) setIsEditing(false);
      toast.success("Perfil actualizado correctamente.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo actualizar el perfil.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEditing = () => {
    setForm({
      nombre: profile.nombre,
      apellido: profile.apellido,
      telefono: profile.telefono ?? "",
      departamento: profile.departamento ?? "",
    });
    setIsEditing(false);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#001C55] text-lg font-bold text-white shadow-lg shadow-[#001C55]/15">
            {initials || "SC"}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              {readOnly ? "Perfil de usuario" : "Perfil personal"}
            </p>
            <h1 className="text-2xl font-bold text-slate-900">{fullName}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {readOnly
                ? "Consulta la información registrada para este usuario."
                : "Actualiza tu información base visible en el sistema SafeCampus."}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          {readOnly && !isEditing && (
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4" />
                Editar perfil
              </Button>
              {headerActions}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
              <UserCircle2 className="h-5 w-5 text-[#001C55]" />
              {readOnly ? "Datos del usuario" : "Datos editables"}
            </CardTitle>
            <CardDescription>
              {readOnly
                ? "Datos usados para identificar al usuario en los módulos operativos y administrativos."
                : "Estos datos se usan para identificarte dentro de los módulos operativos y administrativos."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={onSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="flex items-center gap-1.5">
                    Nombre
                    {identityLocked && <Lock className="h-3 w-3 text-slate-400" />}
                  </Label>
                  <Input
                    id="nombre"
                    value={form.nombre}
                    onChange={(event) => onChange("nombre", event.target.value)}
                    placeholder="Ingresa tu nombre"
                    disabled={isFormReadOnly || identityLocked}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellido" className="flex items-center gap-1.5">
                    Apellido
                    {identityLocked && <Lock className="h-3 w-3 text-slate-400" />}
                  </Label>
                  <Input
                    id="apellido"
                    value={form.apellido}
                    onChange={(event) => onChange("apellido", event.target.value)}
                    placeholder="Ingresa tu apellido"
                    disabled={isFormReadOnly || identityLocked}
                    required
                  />
                </div>
              </div>

              {identityLocked && !isFormReadOnly && (
                <p className="-mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                  <Lock className="h-3 w-3" />
                  El nombre y apellido no podrán editarse.
                </p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    value={form.telefono}
                    onChange={(event) => onChange("telefono", event.target.value)}
                    placeholder="Ej. +51 999 999 999"
                    disabled={isFormReadOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="departamento">Departamento</Label>
                  <Input
                    id="departamento"
                    value={form.departamento}
                    onChange={(event) => onChange("departamento", event.target.value)}
                    placeholder="Ej. Seguridad Integral"
                    disabled={isFormReadOnly}
                  />
                </div>
              </div>

              {!isFormReadOnly && (
              <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                {readOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEditing}
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="gap-2 rounded-xl bg-[#001C55] text-white hover:bg-[#002580]"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
              )}
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900">Resumen de cuenta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                <Mail className="mt-0.5 h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Correo</p>
                  <p className="text-sm font-medium text-slate-900">{profile.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                <IdCard className="mt-0.5 h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Codigo institucional</p>
                  <p className="text-sm font-medium text-slate-900">
                    {profile.codigoInstitucional || "No registrado"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                <Phone className="mt-0.5 h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Telefono actual</p>
                  <p className="text-sm font-medium text-slate-900">
                    {profile.telefono || "No registrado"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                <Building2 className="mt-0.5 h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Departamento</p>
                  <p className="text-sm font-medium text-slate-900">
                    {profile.departamento || "No registrado"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                <IdCard className="mt-0.5 h-4 w-4 text-slate-500" />
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {profile.roles.length === 1 ? "Rol asignado" : "Roles asignados"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profile.roles.length > 0 ? (
                      profile.roles.map((role) => (
                        <RoleBadge key={role} role={role} />
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">Sin rol asignado</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
