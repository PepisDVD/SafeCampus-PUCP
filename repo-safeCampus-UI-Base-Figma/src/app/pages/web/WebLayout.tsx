import { Outlet, NavLink, useNavigate, useLocation } from 'react-router';
import { useState } from 'react';
import {
  LayoutDashboard, FileText, BarChart3, Settings,
  Bell, Shield, LogOut, ChevronLeft, ChevronRight,
  AlertTriangle, User, Menu, X, MessageCircle
} from 'lucide-react';

const navItems = [
  { to: '/web', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/web/casos', icon: FileText, label: 'Gestión de Casos' },
  { to: '/web/kpis', icon: BarChart3, label: 'KPIs y Reportes' },
  { to: '/web/whatsapp', icon: MessageCircle, label: 'WhatsApp' },
  { to: '/web/admin', icon: Settings, label: 'Admin Sistema' },
];

// Determine user based on URL (for demo)
function getUser(path: string) {
  if (path.includes('/admin')) {
    return { name: 'Ana Torres Vega', role: 'Administrador del Sistema', initials: 'AT', color: 'bg-purple-600' };
  }
  return { name: 'Luis Fernández Castro', role: 'Supervisor de Seguridad', initials: 'LF', color: 'bg-[#001C55]' };
}

export default function WebLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = getUser(location.pathname);

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex flex-col h-full bg-[#001C55] ${mobile ? 'w-72' : collapsed ? 'w-16' : 'w-64'} transition-all duration-300`}>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${collapsed && !mobile ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        {(!collapsed || mobile) && (
          <div>
            <div className="text-white font-bold text-sm">SafeCampus</div>
            <div className="text-blue-300 text-[10px]">PUCP · Web Operativa</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => mobile && setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium group ${
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-blue-200 hover:bg-white/8 hover:text-white'
              } ${collapsed && !mobile ? 'justify-center' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-blue-300 group-hover:text-white'}`} />
                {(!collapsed || mobile) && <span>{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Active incidents badge */}
      {(!collapsed || mobile) && (
        <div className="mx-3 mb-3 bg-red-500/20 border border-red-400/30 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <div>
              <div className="text-white text-xs font-bold">2 críticos activos</div>
              <div className="text-red-300 text-[10px]">Requieren atención</div>
            </div>
          </div>
        </div>
      )}

      {/* User */}
      <div className={`border-t border-white/10 p-3 ${collapsed && !mobile ? 'flex justify-center' : ''}`}>
        {(!collapsed || mobile) ? (
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 ${user.color}`}>
              {user.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold truncate">{user.name}</div>
              <div className="text-blue-300 text-[10px] truncate">{user.role}</div>
            </div>
            <button onClick={() => navigate('/')} className="text-blue-300 hover:text-white transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button onClick={() => navigate('/')} className="text-blue-300 hover:text-white transition-colors p-1">
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10">
            <Sidebar mobile />
          </div>
          <button className="absolute top-4 right-4 text-white" onClick={() => setMobileOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center gap-3 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          <div className="flex-1" />

          {/* Alerts */}
          <div className="flex items-center gap-1 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-red-600">2 críticos</span>
          </div>

          {/* Notifications */}
          <button className="relative p-2 rounded-xl hover:bg-gray-100 text-gray-500">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
          </button>

          {/* User avatar */}
          <div className="flex items-center gap-2 border-l border-gray-200 pl-3 ml-1">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold ${user.color}`}>
              {user.initials}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-semibold text-gray-700">{user.name.split(' ')[0]}</div>
              <div className="text-[10px] text-gray-400">{user.role}</div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
