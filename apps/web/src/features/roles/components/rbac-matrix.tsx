"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  ScrollArea,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@safecampus/ui-kit";

import { adminApi, type AdminPermissionApi, type AdminRoleApi } from "@/lib/api/admin";

function prettyPermissionLabel(permission: AdminPermissionApi): string {
  return `${permission.modulo} · ${permission.accion}`;
}

export function RbacMatrix() {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AdminRoleApi[]>([]);
  const [permissions, setPermissions] = useState<AdminPermissionApi[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [permissionIdsByRoleId, setPermissionIdsByRoleId] = useState<Record<string, Set<string>>>({});

  const [createOpen, setCreateOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");

  async function loadAll() {
    setLoading(true);
    try {
      const [rolesRes, permissionsRes, linksRes] = await Promise.all([
        adminApi.listRoles(),
        adminApi.listPermissions(),
        adminApi.listRolePermissions(),
      ]);

      setRoles(rolesRes.items);
      setPermissions(permissionsRes.items);

      const next: Record<string, Set<string>> = {};
      for (const role of rolesRes.items) {
        next[role.id] = new Set<string>();
      }
      for (const link of linksRes.items) {
        if (!next[link.role_id]) next[link.role_id] = new Set<string>();
        const roleSet = next[link.role_id];
        if (roleSet) roleSet.add(link.permission_id);
      }
      setPermissionIdsByRoleId(next);

      if (!selectedRoleId && rolesRes.items.length > 0) {
        const firstRole = rolesRes.items[0];
        if (firstRole) setSelectedRoleId(firstRole.id);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar roles y permisos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );

  const selectedRolePermissionIds = useMemo(
    () => permissionIdsByRoleId[selectedRoleId] ?? new Set<string>(),
    [permissionIdsByRoleId, selectedRoleId],
  );

  const permissionsByModule = useMemo(() => {
    const map = new Map<string, AdminPermissionApi[]>();
    for (const permission of permissions) {
      const list = map.get(permission.modulo) ?? [];
      list.push(permission);
      map.set(permission.modulo, list);
    }
    return map;
  }, [permissions]);

  const togglePermission = (permissionId: string) => {
    if (!selectedRoleId) return;
    setPermissionIdsByRoleId((prev) => {
      const next = { ...prev };
      const set = new Set(next[selectedRoleId] ?? []);
      if (set.has(permissionId)) {
        set.delete(permissionId);
      } else {
        set.add(permissionId);
      }
      next[selectedRoleId] = set;
      return next;
    });
  };

  const saveRolePermissions = async () => {
    if (!selectedRoleId) return;
    try {
      await adminApi.replaceRolePermissions(
        selectedRoleId,
        Array.from(selectedRolePermissionIds.values()),
      );
      toast.success("Permisos del rol actualizados.");
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar permisos.");
    }
  };

  const createRole = async () => {
    if (!newRoleName.trim()) {
      toast.error("Ingresa un nombre para el rol.");
      return;
    }
    try {
      await adminApi.createRole({
        nombre: newRoleName.trim(),
        descripcion: newRoleDescription.trim() || null,
      });
      setCreateOpen(false);
      setNewRoleName("");
      setNewRoleDescription("");
      toast.success("Rol creado correctamente.");
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el rol.");
    }
  };

  const deleteRole = async (role: AdminRoleApi) => {
    if (role.es_sistema) {
      toast.error("No se puede eliminar un rol del sistema.");
      return;
    }
    try {
      await adminApi.deleteRole(role.id);
      toast.success("Rol eliminado.");
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el rol.");
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-muted-foreground">
        Cargando roles y permisos...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Catálogo de roles</p>
          <p className="text-xs text-muted-foreground">Crea roles y gestiona permisos por acción.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo rol
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Rol</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Permisos</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">{role.nombre}</TableCell>
                <TableCell className="text-muted-foreground">{role.descripcion ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={role.es_sistema ? "secondary" : "outline"}>
                    {role.es_sistema ? "Sistema" : "Custom"}
                  </Badge>
                </TableCell>
                <TableCell>{role.permissions_count}</TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-2">
                    <Button
                      variant={selectedRoleId === role.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedRoleId(role.id)}
                    >
                      Editar permisos
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => void deleteRole(role)}
                      disabled={role.es_sistema}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Permisos del rol: {selectedRole?.nombre ?? "(selecciona un rol)"}
            </p>
            <p className="text-xs text-muted-foreground">
              Habilita o deshabilita acciones concretas por módulo.
            </p>
          </div>
          <Button onClick={() => void saveRolePermissions()} disabled={!selectedRoleId}>
            <Save className="mr-2 h-4 w-4" /> Guardar permisos
          </Button>
        </div>

        <ScrollArea className="h-105 rounded-md border border-slate-200 p-3">
          <div className="space-y-4">
            {Array.from(permissionsByModule.entries()).map(([module, modulePermissions]) => (
              <div key={module} className="rounded-md border border-slate-200 p-3">
                <p className="mb-2 text-sm font-semibold text-slate-800">{module}</p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {modulePermissions.map((permission) => {
                    const checked = selectedRolePermissionIds.has(permission.id);
                    return (
                      <label
                        key={permission.id}
                        className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4"
                          checked={checked}
                          onChange={() => togglePermission(permission.id)}
                          disabled={!selectedRoleId}
                        />
                        <span className="text-xs text-slate-700">{prettyPermissionLabel(permission)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo rol</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="role-name">Nombre oficial</Label>
              <Input
                id="role-name"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Ej. operador_noche"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="role-description">Descripción</Label>
              <Input
                id="role-description"
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                placeholder="Descripción funcional del rol"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void createRole()}>Crear rol</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
