import { api } from "./client";

export type AdminUserApi = {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  codigo_institucional: string | null;
  departamento: string | null;
  estado: string;
  ultimo_acceso: string | null;
  created_at: string;
  updated_at: string;
  roles: string[];
};

export type AdminUsersResponse = {
  items: AdminUserApi[];
  total: number;
};

export type CreateAdminUserPayload = {
  email: string;
  nombre: string;
  apellido: string;
  codigo_institucional?: string | null;
  departamento?: string | null;
  estado?: string;
  role_ids: string[];
};

export type UpdateAdminUserPayload = {
  email?: string;
  nombre?: string;
  apellido?: string;
  codigo_institucional?: string | null;
  departamento?: string | null;
  estado?: string;
  role_ids?: string[];
};

export type AdminRoleApi = {
  id: string;
  nombre: string;
  descripcion: string | null;
  es_sistema: boolean;
  permissions_count: number;
};

export type AdminRolesResponse = {
  items: AdminRoleApi[];
  total: number;
};

export type AdminPermissionApi = {
  id: string;
  modulo: string;
  accion: string;
  descripcion: string | null;
};

export type AdminPermissionsResponse = {
  items: AdminPermissionApi[];
  total: number;
};

export type RolePermissionApi = {
  role_id: string;
  permission_id: string;
};

export type RolePermissionsResponse = {
  items: RolePermissionApi[];
};

export type ApiActionResponse = {
  ok: boolean;
  message: string;
};

export type AdminIntegrationApi = {
  id: string;
  servicio: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  estado: string;
  ultima_verificacion: string | null;
  latencia_ms: number | null;
  mensaje_estado: string;
  detalle: Record<string, unknown>;
};

export type AdminIntegrationsResponse = {
  items: AdminIntegrationApi[];
  total: number;
};

export type AdminIntegrationVerifyResponse = {
  ok: boolean;
  message: string;
  item: AdminIntegrationApi;
};

export type AdminAuditLogApi = {
  id: string;
  tipo: string;
  actor: string;
  accion: string;
  detalle: string;
  timestamp: string;
  modulo: string;
  entidad: string | null;
  entidad_id: string | null;
  ip_origen: string | null;
  dispositivo: string | null;
};

export type AdminAuditLogsResponse = {
  items: AdminAuditLogApi[];
  total: number;
  limit: number;
};

export const adminApi = {
  listUsers() {
    return api.get<AdminUsersResponse>("/admin/users");
  },
  createUser(payload: CreateAdminUserPayload) {
    return api.post<ApiActionResponse>("/admin/users", payload);
  },
  updateUser(userId: string, payload: UpdateAdminUserPayload) {
    return api.patch<ApiActionResponse>(`/admin/users/${userId}`, payload);
  },
  suspendUser(userId: string) {
    return api.post<ApiActionResponse>(`/admin/users/${userId}/suspend`);
  },
  reactivateUser(userId: string) {
    return api.post<ApiActionResponse>(`/admin/users/${userId}/reactivate`);
  },
  listRoles() {
    return api.get<AdminRolesResponse>("/admin/roles");
  },
  createRole(payload: { nombre: string; descripcion?: string | null }) {
    return api.post<ApiActionResponse>("/admin/roles", payload);
  },
  updateRole(roleId: string, payload: { nombre?: string; descripcion?: string | null }) {
    return api.patch<ApiActionResponse>(`/admin/roles/${roleId}`, payload);
  },
  deleteRole(roleId: string) {
    return api.delete<ApiActionResponse>(`/admin/roles/${roleId}`);
  },
  listPermissions() {
    return api.get<AdminPermissionsResponse>("/admin/permissions");
  },
  listRolePermissions() {
    return api.get<RolePermissionsResponse>("/admin/role-permissions");
  },
  replaceRolePermissions(roleId: string, permissionIds: string[]) {
    return api.put<ApiActionResponse>(`/admin/roles/${roleId}/permissions`, {
      permission_ids: permissionIds,
    });
  },
  listIntegrations() {
    return api.get<AdminIntegrationsResponse>("/admin/integrations");
  },
  verifyIntegration(serviceName: string) {
    return api.post<AdminIntegrationVerifyResponse>(`/admin/integrations/${serviceName}/verify`);
  },
  listAuditLogs(params: {
    search?: string;
    event_type?: string;
    modulo?: string;
    desde?: string;
    hasta?: string;
    limit?: number;
  }) {
    const query: Record<string, string> = {};
    if (params.search) query.search = params.search;
    if (params.event_type) query.event_type = params.event_type;
    if (params.modulo) query.modulo = params.modulo;
    if (params.desde) query.desde = params.desde;
    if (params.hasta) query.hasta = params.hasta;
    if (params.limit) query.limit = String(params.limit);

    return api.get<AdminAuditLogsResponse>("/admin/audit-logs", { params: query });
  },
};
