"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@safecampus/ui-kit";
import { Building2, IdCard, Mail, Phone, Save, ShieldCheck, UserCircle2 } from "lucide-react";

import { updateCurrentProfile } from "@/lib/auth";

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
};

function prettyRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function getRoleTone(role: string): string {
  switch (role.toLowerCase()) {
    case "administrador":
      return "bg-violet-100 text-violet-700";
    case "supervisor":
      return "bg-blue-100 text-blue-700";
    case "operador":
      return "bg-orange-100 text-orange-700";
    default:
      return "bg-emerald-100 text-emerald-700";
  }
}

export function ProfilePageClient({ profile }: ProfilePageClientProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: profile.nombre,
    apellido: profile.apellido,
    telefono: profile.telefono ?? "",
    departamento: profile.departamento ?? "",
  });
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

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
    setFeedback(null);

    setIsSaving(true);

    try {
      await updateCurrentProfile({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        telefono: form.telefono.trim() || null,
        departamento: form.departamento.trim() || null,
      });
      setFeedback({
        type: "success",
        message: "Perfil actualizado correctamente.",
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el perfil.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#001C55] text-lg font-bold text-white shadow-lg shadow-[#001C55]/15">
            {initials || "SC"}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Perfil personal</p>
            <h1 className="text-2xl font-bold text-slate-900">{fullName}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Actualiza tu informacion base visible en el sistema SafeCampus.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {profile.roles.map((role) => (
            <Badge key={role} className={getRoleTone(role)}>
              {prettyRole(role)}
            </Badge>
          ))}
        </div>
      </div>

      {feedback && (
        <div
          className={
            feedback.type === "success"
              ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              : "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          }
        >
          {feedback.message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
              <UserCircle2 className="h-5 w-5 text-[#001C55]" />
              Datos editables
            </CardTitle>
            <CardDescription>
              Estos datos se usan para identificarte dentro de los modulos operativos y administrativos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={onSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    value={form.nombre}
                    onChange={(event) => onChange("nombre", event.target.value)}
                    placeholder="Ingresa tu nombre"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellido">Apellido</Label>
                  <Input
                    id="apellido"
                    value={form.apellido}
                    onChange={(event) => onChange("apellido", event.target.value)}
                    placeholder="Ingresa tu apellido"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="telefono">Telefono</Label>
                  <Input
                    id="telefono"
                    value={form.telefono}
                    onChange={(event) => onChange("telefono", event.target.value)}
                    placeholder="Ej. +51 999 999 999"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="departamento">Departamento / area</Label>
                  <Input
                    id="departamento"
                    value={form.departamento}
                    onChange={(event) => onChange("departamento", event.target.value)}
                    placeholder="Ej. Seguridad Integral"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="gap-2 rounded-xl bg-[#001C55] text-white hover:bg-[#002580]"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900">Resumen de cuenta</CardTitle>
              <CardDescription>
                Informacion institucional y de acceso disponible para tu usuario.
              </CardDescription>
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
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                <ShieldCheck className="h-5 w-5 text-[#001C55]" />
                Acceso y permisos
              </CardTitle>
              <CardDescription>
                Tus permisos se administran por rol. Si necesitas cambios estructurales, solicitalos a administracion.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {profile.roles.map((role) => (
                <Badge key={role} className={getRoleTone(role)}>
                  {prettyRole(role)}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
