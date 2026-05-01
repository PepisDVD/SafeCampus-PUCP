"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Button,
  Badge,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Card,
  CardContent,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@safecampus/ui-kit";
import {
  Users,
  UserCheck,
  UserX,
  UserMinus,
  Search,
  Plus,
  Pencil,
  Ban,
  RotateCcw,
} from "lucide-react";
import { cambiarEstadoUsuario } from "../../actions/usuario.actions";
import { UsuarioEstadoBadge } from "./usuario-estado-badge";
import { UsuarioForm } from "./usuario-form";
import type { UsuarioConRoles } from "../../services/usuario.service";
import type { RolConPermisos } from "../../services/rol.service";

type StatsData = {
  total: number;
  activos: number;
  inactivos: number;
  suspendidos: number;
};

type UsuariosClientProps = {
  initialUsuarios: UsuarioConRoles[];
  roles: RolConPermisos[];
  stats: StatsData;
};

export function UsuariosClient({
  initialUsuarios,
  roles,
  stats,
}: UsuariosClientProps) {
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("todos");
  const [rolFilter, setRolFilter] = useState<string>("todos");

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UsuarioConRoles | undefined>();
  const [suspendTarget, setSuspendTarget] = useState<UsuarioConRoles | null>(
    null,
  );
  const [activarTarget, setActivarTarget] = useState<UsuarioConRoles | null>(
    null,
  );

  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return initialUsuarios.filter((u) => {
      const term = search.toLowerCase();
      const matchesSearch =
        !term ||
        u.nombre.toLowerCase().includes(term) ||
        u.apellido.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term);

      const matchesEstado =
        estadoFilter === "todos" || u.estado === estadoFilter;

      const matchesRol =
        rolFilter === "todos" || u.roles.some((r) => r.id === rolFilter);

      return matchesSearch && matchesEstado && matchesRol;
    });
  }, [initialUsuarios, search, estadoFilter, rolFilter]);

  const handleSuspender = () => {
    if (!suspendTarget) return;
    setActionError(null);
    startTransition(async () => {
      const result = await cambiarEstadoUsuario(
        suspendTarget.id,
        "SUSPENDIDO",
      );
      if (result.error) {
        setActionError(result.error);
      }
      setSuspendTarget(null);
    });
  };

  const handleActivar = () => {
    if (!activarTarget) return;
    setActionError(null);
    startTransition(async () => {
      const result = await cambiarEstadoUsuario(activarTarget.id, "ACTIVO");
      if (result.error) {
        setActionError(result.error);
      }
      setActivarTarget(null);
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Gestión de Usuarios
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Administración de cuentas, roles y estados del sistema
          </p>
        </div>
        <Button
          onClick={() => {
            setEditTarget(undefined);
            setModalOpen(true);
          }}
          className="bg-[#001C55] hover:bg-[#001C55]/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo usuario
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Total",
            value: stats.total,
            icon: Users,
            color: "text-slate-600",
          },
          {
            label: "Activos",
            value: stats.activos,
            icon: UserCheck,
            color: "text-emerald-600",
          },
          {
            label: "Inactivos",
            value: stats.inactivos,
            icon: UserX,
            color: "text-slate-400",
          },
          {
            label: "Suspendidos",
            value: stats.suspendidos,
            icon: UserMinus,
            color: "text-red-500",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border shadow-none">
            <CardContent className="flex items-center gap-3 p-4">
              <Icon className={`h-8 w-8 ${color}`} />
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, apellido o correo..."
            className="pl-9"
          />
        </div>
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="ACTIVO">Activo</SelectItem>
            <SelectItem value="INACTIVO">Inactivo</SelectItem>
            <SelectItem value="SUSPENDIDO">Suspendido</SelectItem>
          </SelectContent>
        </Select>
        <Select value={rolFilter} onValueChange={setRolFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los roles</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {actionError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {actionError}
        </p>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Usuario</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Último acceso</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-12 text-center text-muted-foreground"
                >
                  No se encontraron usuarios con los filtros aplicados.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">
                        {u.nombre} {u.apellido}
                      </p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {u.codigo_institucional ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {u.departamento ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length > 0 ? (
                        u.roles.map((r) => (
                          <Badge
                            key={r.id}
                            variant="secondary"
                            className="text-xs"
                          >
                            {r.nombre}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Sin rol
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <UsuarioEstadoBadge estado={u.estado} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(u.ultimo_acceso)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Editar"
                        onClick={() => {
                          setEditTarget(u);
                          setModalOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {u.estado !== "SUSPENDIDO" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          title="Suspender"
                          onClick={() => setSuspendTarget(u)}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          title="Reactivar"
                          onClick={() => setActivarTarget(u)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit modal */}
      <UsuarioForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        roles={roles}
        usuario={editTarget}
      />

      {/* Suspend confirmation */}
      <AlertDialog
        open={!!suspendTarget}
        onOpenChange={(v) => !v && setSuspendTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspender usuario</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirmas que deseas suspender a{" "}
              <strong>
                {suspendTarget?.nombre} {suspendTarget?.apellido}
              </strong>
              ? El usuario perderá acceso inmediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspender}
              disabled={isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isPending ? "Suspendiendo..." : "Suspender"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activate confirmation */}
      <AlertDialog
        open={!!activarTarget}
        onOpenChange={(v) => !v && setActivarTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivar usuario</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirmas que deseas reactivar a{" "}
              <strong>
                {activarTarget?.nombre} {activarTarget?.apellido}
              </strong>
              ? El usuario recuperará el acceso al sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleActivar}
              disabled={isPending}
              className="bg-[#001C55] hover:bg-[#001C55]/90"
            >
              {isPending ? "Activando..." : "Reactivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
