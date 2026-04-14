import { Outlet, NavLink, useNavigate } from 'react-router';
import { LayoutDashboard, FileText, Map, User, Shield, RadioTower } from 'lucide-react';

const navItems = [
  { to: '/operador', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/operador/incidentes', icon: FileText, label: 'Incidentes' },
  { to: '/operador/mapa', icon: Map, label: 'Mapa' },
  { to: '/operador/perfil', icon: User, label: 'Perfil' },
];

export default function OperadorLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-start justify-center bg-gray-900">
      {/* Phone frame for desktop */}
      <div className="w-full max-w-[430px] min-h-screen bg-[#0d1117] flex flex-col shadow-2xl relative">
        {/* Status bar – dark */}
        <div className="flex items-center justify-between px-5 pt-2 pb-1 bg-[#0d1117]">
          <span className="text-[11px] text-gray-400 font-medium">9:41</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-[10px] text-green-400 font-bold">EN SERVICIO</span>
            <div className="flex gap-0.5 ml-2">
              {[3, 4, 5].map(h => <div key={h} className="w-1 bg-gray-400 rounded-sm" style={{ height: `${h * 2}px` }} />)}
            </div>
            <div className="w-5 h-2.5 border border-gray-500 rounded-sm ml-1 flex items-center px-0.5">
              <div className="w-3.5 h-1.5 bg-green-400 rounded-sm" />
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="bg-[#0d1117] px-5 pb-3 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500/20 rounded-xl flex items-center justify-center">
              <Shield className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <div className="text-white text-sm font-bold leading-none">SafeCampus</div>
              <div className="text-orange-400 text-[10px] leading-none mt-0.5 flex items-center gap-1">
                <RadioTower className="w-2.5 h-2.5" /> Operador · Turno Mañana
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 text-[10px] border border-gray-700 px-2 py-1 rounded-lg hover:border-gray-500 transition-colors"
          >
            Salir
          </button>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto pb-20 bg-[#0d1117]">
          <Outlet />
        </div>

        {/* Bottom nav – dark */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#161b22] border-t border-gray-800 flex z-50">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${isActive ? 'text-orange-400' : 'text-gray-600'}`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-orange-500/15' : ''}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}
