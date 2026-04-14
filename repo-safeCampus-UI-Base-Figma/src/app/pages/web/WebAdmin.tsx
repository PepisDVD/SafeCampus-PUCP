import { useState } from 'react';
import type { ElementType } from 'react';
import {
  Users, Settings, Activity, Shield, Search, Plus, Edit,
  CheckCircle, XCircle, AlertCircle, Clock, RefreshCw,
  Server, Bell, Key, LogOut
} from 'lucide-react';
import { mockUsers, integrations, auditLog } from '../../data/mockData';

const tabs = [
  { id: 'usuarios', label: 'Usuarios', icon: Users },
  { id: 'roles', label: 'Roles y Permisos', icon: Key },
  { id: 'integraciones', label: 'Integraciones', icon: Server },
  { id: 'auditoria', label: 'Auditoría', icon: Activity },
];

const roleColor: Record<string, string> = {
  comunidad: 'bg-blue-100 text-blue-700',
  operador: 'bg-orange-100 text-orange-700',
  supervisor: 'bg-purple-100 text-purple-700',
  admin: 'bg-red-100 text-red-700',
};

const roleLabel: Record<string, string> = {
  comunidad: 'Comunidad',
  operador: 'Operador',
  supervisor: 'Supervisor',
  admin: 'Administrador',
};

const statusStyle: Record<string, string> = {
  activo: 'bg-green-100 text-green-700',
  inactivo: 'bg-gray-100 text-gray-500',
  suspendido: 'bg-red-100 text-red-600',
};

const integrationStatus: Record<string, { color: string; icon: ElementType }> = {
  operativo: { color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle },
  degradado: { color: 'text-amber-600 bg-amber-50 border-amber-200', icon: AlertCircle },
  inactivo: { color: 'text-red-600 bg-red-50 border-red-200', icon: XCircle },
};

const permissionsMatrix = [
  { feature: 'Ver dashboard', comunidad: false, operador: true, supervisor: true, admin: true },
  { feature: 'Reportar incidente', comunidad: true, operador: true, supervisor: true, admin: true },
  { feature: 'Gestionar incidentes', comunidad: false, operador: true, supervisor: true, admin: true },
  { feature: 'Cerrar incidentes', comunidad: false, operador: true, supervisor: true, admin: true },
  { feature: 'Escalar incidentes', comunidad: false, operador: true, supervisor: true, admin: true },
  { feature: 'Ver KPIs', comunidad: false, operador: false, supervisor: true, admin: true },
  { feature: 'Exportar reportes', comunidad: false, operador: false, supervisor: true, admin: true },
  { feature: 'Gestionar usuarios', comunidad: false, operador: false, supervisor: false, admin: true },
  { feature: 'Configurar roles', comunidad: false, operador: false, supervisor: false, admin: true },
  { feature: 'Ver integraciones', comunidad: false, operador: false, supervisor: false, admin: true },
  { feature: 'Ver auditoría', comunidad: false, operador: false, supervisor: true, admin: true },
  { feature: 'Lost & Found', comunidad: true, operador: true, supervisor: true, admin: true },
  { feature: 'Acompañamiento seguro', comunidad: true, operador: false, supervisor: false, admin: false },
];

export default function WebAdmin() {
  const [activeTab, setActiveTab] = useState('usuarios');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [showUserForm, setShowUserForm] = useState(false);

  const filteredUsers = mockUsers.filter(u => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterRole !== 'todos' && u.role !== filterRole) return false;
    if (filterStatus !== 'todos' && u.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Administración del Sistema</h1>
            <p className="text-xs text-gray-400">SafeCampus PUCP · Panel administrativo</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-1.5 rounded-xl">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-green-700">Sistema operativo</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${activeTab === id ? 'bg-[#001C55] text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {/* USUARIOS TAB */}
        {activeTab === 'usuarios' && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Total usuarios', value: mockUsers.length, color: 'text-[#001C55] bg-blue-50' },
                { label: 'Activos', value: mockUsers.filter(u => u.status === 'activo').length, color: 'text-green-600 bg-green-50' },
                { label: 'Inactivos', value: mockUsers.filter(u => u.status === 'inactivo').length, color: 'text-gray-600 bg-gray-50' },
                { label: 'Suspendidos', value: mockUsers.filter(u => u.status === 'suspendido').length, color: 'text-red-600 bg-red-50' },
              ].map(stat => (
                <div key={stat.label} className={`rounded-2xl p-4 border border-gray-100 ${stat.color}`}>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs font-semibold mt-1 opacity-80">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nombre, email o código..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#001C55] bg-gray-50"
                />
              </div>
              <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none">
                <option value="todos">Todos los roles</option>
                <option value="comunidad">Comunidad</option>
                <option value="operador">Operador</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Administrador</option>
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none">
                <option value="todos">Todos los estados</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="suspendido">Suspendido</option>
              </select>
              <button
                onClick={() => setShowUserForm(true)}
                className="flex items-center gap-2 bg-[#001C55] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#002580] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Nuevo usuario
              </button>
            </div>

            {/* Users table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Usuario', 'Código', 'Departamento', 'Rol', 'Estado', 'Último acceso', 'Acciones'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-[11px] font-bold shrink-0 ${roleColor[user.role].includes('blue') ? 'bg-blue-600' : roleColor[user.role].includes('orange') ? 'bg-orange-600' : roleColor[user.role].includes('purple') ? 'bg-purple-700' : 'bg-red-600'}`}>
                            {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-gray-800">{user.name}</div>
                            <div className="text-[10px] text-gray-400">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 font-mono">{user.code}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px]"><span className="truncate block">{user.department}</span></td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${roleColor[user.role]}`}>{roleLabel[user.role]}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${statusStyle[user.status]}`}>{user.status}</span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-gray-400 whitespace-nowrap">{user.lastLogin || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-[#001C55] transition-colors">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                            <LogOut className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {showUserForm && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                  <h3 className="text-base font-bold text-gray-900 mb-4">Nuevo usuario</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Nombre completo', type: 'text', placeholder: 'Nombre completo' },
                      { label: 'Correo institucional', type: 'email', placeholder: 'usuario@pucp.edu.pe' },
                      { label: 'Código institucional', type: 'text', placeholder: 'Código o ID' },
                      { label: 'Departamento', type: 'text', placeholder: 'Facultad / Área' },
                    ].map(field => (
                      <div key={field.label}>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">{field.label}</label>
                        <input type={field.type} placeholder={field.placeholder} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#001C55] bg-gray-50" />
                      </div>
                    ))}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Rol</label>
                      <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#001C55] bg-white">
                        <option>Comunidad</option>
                        <option>Operador</option>
                        <option>Supervisor</option>
                        <option>Administrador</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-5">
                    <button onClick={() => setShowUserForm(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold">Cancelar</button>
                    <button onClick={() => setShowUserForm(false)} className="flex-1 bg-[#001C55] text-white py-2.5 rounded-xl text-sm font-semibold">Crear usuario</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ROLES TAB */}
        {activeTab === 'roles' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">Matriz de permisos por rol</h3>
              <p className="text-xs text-gray-400 mt-0.5">Control de acceso basado en roles (RBAC)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400">Funcionalidad</th>
                    {['Comunidad', 'Operador', 'Supervisor', 'Admin'].map(role => (
                      <th key={role} className="px-4 py-3 text-center text-[11px] font-semibold text-gray-400">{role}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissionsMatrix.map(({ feature, comunidad, operador, supervisor, admin }) => (
                    <tr key={feature} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-xs font-medium text-gray-700">{feature}</td>
                      {[comunidad, operador, supervisor, admin].map((allowed, i) => (
                        <td key={i} className="px-4 py-3 text-center">
                          {allowed
                            ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                            : <XCircle className="w-4 h-4 text-gray-200 mx-auto" />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* INTEGRACIONES TAB */}
        {activeTab === 'integraciones' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {integrations.map(int => {
                const cfg = integrationStatus[int.status];
                const StatusIcon = cfg.icon;
                return (
                  <div key={int.name} className={`bg-white rounded-2xl border p-4 shadow-sm flex items-center gap-4 ${cfg.color}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.color}`}>
                      <StatusIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-800">{int.name}</div>
                      <div className="flex items-center gap-3 mt-1 text-[10px]">
                        <span className="text-gray-500">Uptime: <span className="font-bold text-gray-700">{int.uptime}</span></span>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-400">Verificado {int.lastCheck}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-2.5 py-1.5 rounded-xl capitalize border ${cfg.color}`}>{int.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">Última verificación: hace 1 minuto</p>
              <button className="flex items-center gap-2 text-xs text-[#001C55] font-semibold border border-blue-200 px-3 py-1.5 rounded-xl hover:bg-blue-50">
                <RefreshCw className="w-3.5 h-3.5" /> Verificar ahora
              </button>
            </div>
          </div>
        )}

        {/* AUDITORÍA TAB */}
        {activeTab === 'auditoria' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Registro de auditoría</h3>
                <p className="text-xs text-gray-400">Acciones críticas y cambios del sistema</p>
              </div>
              <button className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-50">
                <Search className="w-3.5 h-3.5" /> Filtrar
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {auditLog.map(log => (
                <div key={log.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-gray-800">{log.user}</span>
                        <span className="text-[10px] text-gray-400">·</span>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{log.time}
                        </span>
                      </div>
                      <div className="text-xs text-gray-700">{log.action}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{log.detail}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}