"use client";

import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@safecampus/ui-kit";

import {
  ADMIN_FULL_NAV_ITEMS,
  AppShell,
  COMUNIDAD_NAV_ITEMS,
  type AppNavItem,
  OPERATIVO_NAV_ITEMS,
} from "@/components/layout";
import { profileApi, type MyProfileResponse } from "@/lib/api/profile";

type ProfileForm = {
  nombre: string;
  apellido: string;
  departamento: string;
  telefono: string;
  avatar_url: string;
};

export default function PerfilPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<MyProfileResponse | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    nombre: "",
    apellido: "",
    departamento: "",
    telefono: "",
    avatar_url: "",
  });

  useEffect(() => {
    let active = true;
    void profileApi
      .getMe()
      .then((data) => {
        if (!active) return;
        setProfile(data);
        setForm({
          nombre: data.nombre,
          apellido: data.apellido,
          departamento: data.departamento ?? "",
          telefono: data.telefono ?? "",
          avatar_url: data.avatar_url ?? "",
        });
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "No se pudo cargar el perfil.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const onSave = async () => {
    setSaving(true);
    try {
      const updated = await profileApi.updateMe({
        nombre: form.nombre,
        apellido: form.apellido,
        departamento: form.departamento || null,
        telefono: form.telefono || null,
        avatar_url: form.avatar_url || null,
      });
      setProfile(updated);
      toast.success("Perfil actualizado correctamente.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el perfil.");
    } finally {
      setSaving(false);
    }
  };

  const navItems = useMemo<AppNavItem[]>(() => {
    const roles = profile?.roles ?? [];
    if (roles.includes("administrador")) return ADMIN_FULL_NAV_ITEMS;
    if (roles.includes("supervisor") || roles.includes("operador")) return OPERATIVO_NAV_ITEMS;
    return COMUNIDAD_NAV_ITEMS;
  }, [profile]);

  return (
    <AppShell
      appTitle="Configuración de cuenta"
      appSubtitle="Perfil de usuario"
      navItems={navItems}
    >
      {loading ? (
        <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-muted-foreground">
          Cargando perfil...
        </div>
      ) : (
        <div className="mx-auto max-w-3xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mi perfil</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Información personal de sesión y datos de contacto.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Datos de cuenta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Correo institucional</Label>
                  <Input value={profile?.email ?? ""} disabled />
                </div>
                <div className="space-y-1">
                  <Label>Roles</Label>
                  <Input value={(profile?.roles ?? []).join(", ")} disabled />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    value={form.nombre}
                    onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="apellido">Apellido</Label>
                  <Input
                    id="apellido"
                    value={form.apellido}
                    onChange={(e) => setForm((prev) => ({ ...prev, apellido: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="departamento">Departamento</Label>
                  <Input
                    id="departamento"
                    value={form.departamento}
                    onChange={(e) => setForm((prev) => ({ ...prev, departamento: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    value={form.telefono}
                    onChange={(e) => setForm((prev) => ({ ...prev, telefono: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="avatar">Avatar URL</Label>
                <Input
                  id="avatar"
                  value={form.avatar_url}
                  onChange={(e) => setForm((prev) => ({ ...prev, avatar_url: e.target.value }))}
                />
              </div>

              <div className="pt-2">
                <Button onClick={() => void onSave()} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
