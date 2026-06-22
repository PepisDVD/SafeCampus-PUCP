"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  FilterBar,
  MultiSelectFilter,
  RoleBadge,
  SearchInput,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TablePaginationBar,
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
  formatRoleLabel,
} from "@safecampus/ui-kit";
import {
  Users,
  UserCheck,
  UserX,
  UserMinus,
  Eye,
  Plus,
  Ban,
  RotateCcw,
} from "lucide-react";
import { toast } from "@safecampus/ui-kit";
import {
  actualizarPerfilUsuario,
  cambiarEstadoUsuario,
} from "../../actions/usuario.actions";
import { UsuarioEstadoBadge } from "./usuario-estado-badge";
import { UsuarioForm } from "./usuario-form";
import { ProfilePageClient } from "@/features/profile/components/profile-page-client";
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

const PER_PAGE = 10;

export function UsuariosClient({
  initialUsuarios,
  roles,
  stats,
}: UsuariosClientProps) {
  const [usuarios, setUsuarios] = useState(initialUsuarios);
  const [search, setSearch] = useState("");
  const [estadoFilters, setEstadoFilters] = useState<string[]>([]);
  const [rolFilters, setRolFilters] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<UsuarioConRoles | null>(
    null,
  );
  const [activarTarget, setActivarTarget] = useState<UsuarioConRoles | null>(
    null,
  );
  const [profileTarget, setProfileTarget] = useState<UsuarioConRoles | null>(null);
  // Id de la fila cuyo estado se está actualizando (muestra skeleton de carga).
  const [pendingRowId, setPendingRowId] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setUsuarios(initialUsuarios);
  }, [initialUsuarios]);

  const filtered = useMemo(() => {
    return usuarios.filter((u) => {
      const term = search.toLowerCase();
      const matchesSearch =
        !term ||
        u.nombre.toLowerCase().includes(term) ||
        u.apellido.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term);

      const matchesEstado =
        estadoFilters.length === 0 || estadoFilters.includes(u.estado);

      const matchesRol =
        rolFilters.length === 0 || u.roles.some((r) => rolFilters.includes(r.id));

      return matchesSearch && matchesEstado && matchesRol;
    });
  }, [usuarios, search, estadoFilters, rolFilters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));

  // Mantener la página dentro de rango cuando cambian filtros o resultados.
  useEffect(() => {
    setPage(1);
  }, [search, estadoFilters, rolFilters]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [filtered, page],
  );

  const handleSuspender = () => {
    if (!suspendTarget) return;
    const targetId = suspendTarget.id;
    setPendingRowId(targetId);
    setSuspendTarget(null);
    startTransition(async () => {
      const result = await cambiarEstadoUsuario(targetId, "SUSPENDIDO");
      if (result.error) {
        toast.error(result.error);
      } else {
        setUsuarios((current) =>
          current.map((usuario) =>
            usuario.id === targetId
              ? { ...usuario, estado: "SUSPENDIDO" }
              : usuario,
          ),
        );
        setProfileTarget((current) =>
          current && current.id === targetId
            ? { ...current, estado: "SUSPENDIDO" }
            : current,
        );
        toast.success("Usuario suspendido correctamente.");
      }
      setPendingRowId(null);
    });
  };

  const handleActivar = () => {
    if (!activarTarget) return;
    const targetId = activarTarget.id;
    setPendingRowId(targetId);
    setActivarTarget(null);
    startTransition(async () => {
      const result = await cambiarEstadoUsuario(targetId, "ACTIVO");
      if (result.error) {
        toast.error(result.error);
      } else {
        setUsuarios((current) =>
          current.map((usuario) =>
            usuario.id === targetId
              ? { ...usuario, estado: "ACTIVO" }
              : usuario,
          ),
        );
        setProfileTarget((current) =>
          current && current.id === targetId
            ? { ...current, estado: "ACTIVO" }
            : current,
        );
        toast.success("Usuario reactivado correctamente.");
      }
      setPendingRowId(null);
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
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
      <FilterBar className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          containerClassName="flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, apellido o correo..."
        />
        <MultiSelectFilter
          className="w-full sm:w-44"
          placeholder="Todos los estados"
          options={[
            { value: "ACTIVO", label: "Activos" },
            { value: "INACTIVO", label: "Inactivos" },
            { value: "SUSPENDIDO", label: "Suspendidos" },
          ]}
          selected={estadoFilters}
          onChange={setEstadoFilters}
        />
        <MultiSelectFilter
          className="w-full sm:w-48"
          placeholder="Todos los roles"
          options={roles.map((rol) => ({
            value: rol.id,
            label: formatRoleLabel(rol.nombre),
          }))}
          selected={rolFilters}
          onChange={setRolFilters}
        />
      </FilterBar>


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
              paginated.map((u) =>
                u.id === pendingRowId ? (
                  <UsuarioRowSkeleton key={u.id} />
                ) : (
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
                          <RoleBadge key={r.id} role={r.nombre} className="text-xs" />
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={`Ver detalle de ${u.nombre} ${u.apellido}`}
                      onClick={() => setProfileTarget(u)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                ),
              )
            )}
          </TableBody>
        </Table>
        {filtered.length > 0 && (
          <TablePaginationBar
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            perPage={PER_PAGE}
            entityLabel="usuarios"
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        )}
      </div>

      {/* Create/Edit modal */}
      <UsuarioForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        roles={roles}
      />

      <Dialog open={Boolean(profileTarget)} onOpenChange={(open) => !open && setProfileTarget(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-6xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Perfil de usuario</DialogTitle>
            <DialogDescription>Información registrada del usuario seleccionado.</DialogDescription>
          </DialogHeader>
          {profileTarget && (
            <ProfilePageClient
              readOnly
              headerActions={
                profileTarget.estado !== "SUSPENDIDO" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
                    disabled={isPending}
                    onClick={() => setSuspendTarget(profileTarget)}
                  >
                    <Ban className="h-4 w-4" />
                    Suspender
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => setActivarTarget(profileTarget)}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reactivar
                  </Button>
                )
              }
              onSave={async (values) => {
                const result = await actualizarPerfilUsuario({
                  id: profileTarget.id,
                  ...values,
                });
                if (!result.error) {
                  setUsuarios((current) =>
                    current.map((usuario) =>
                      usuario.id === profileTarget.id
                        ? {
                            ...usuario,
                            nombre: values.nombre,
                            apellido: values.apellido,
                            telefono: values.telefono || null,
                            departamento: values.departamento || null,
                          }
                        : usuario,
                    ),
                  );
                  setProfileTarget((current) =>
                    current
                      ? {
                          ...current,
                          nombre: values.nombre,
                          apellido: values.apellido,
                          telefono: values.telefono || null,
                          departamento: values.departamento || null,
                        }
                      : current,
                  );
                }
                return result;
              }}
              profile={{
                id: profileTarget.id,
                nombre: profileTarget.nombre,
                apellido: profileTarget.apellido,
                email: profileTarget.email,
                codigoInstitucional: profileTarget.codigo_institucional,
                telefono: profileTarget.telefono,
                departamento: profileTarget.departamento,
                roles: profileTarget.roles.map((role) => role.nombre),
              }}
            />
          )}
        </DialogContent>
      </Dialog>

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

function UsuarioRowSkeleton() {
  return (
    <TableRow aria-busy="true" className="animate-pulse">
      <TableCell>
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-16 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-20 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-28" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="ml-auto h-8 w-8 rounded-md" />
      </TableCell>
    </TableRow>
  );
}
