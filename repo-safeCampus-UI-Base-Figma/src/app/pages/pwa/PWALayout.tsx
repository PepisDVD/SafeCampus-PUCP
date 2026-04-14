import { Outlet, NavLink, useNavigate } from 'react-router';
import { Home, AlertTriangle, Search, Package, User, Shield } from 'lucide-react';

const navItems = [
  { to: '/pwa', icon: Home, label: 'Inicio', end: true },
  { to: '/pwa/reportar', icon: AlertTriangle, label: 'Reportar' },
  { to: '/pwa/mis-casos', icon: Search, label: 'Mis casos' },
  { to: '/pwa/lost-found', icon: Package, label: 'Lost & Found' },
  { to: '/pwa/perfil', icon: User, label: 'Perfil' },
];

export default function PWALayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center">
      {/* Phone frame wrapper for desktop */}
      <div className="w-full max-w-[430px] min-h-screen bg-white flex flex-col shadow-2xl relative">
        {/* Status bar */}
        <div className="flex items-center justify-between px-5 pt-2 pb-1 bg-[#001C55]">
          <span className="text-[11px] text-white/80 font-medium">9:41</span>
          <div className="flex gap-1 items-center">
            <div className="flex gap-0.5">
              {[3, 4, 5].map(h => <div key={h} className="w-1 bg-white/80 rounded-sm" style={{ height: `${h * 2}px` }} />)}
            </div>
            <svg className="w-3 h-3 text-white/80 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
            <div className="w-5 h-2.5 border border-white/60 rounded-sm ml-1 flex items-center px-0.5">
              <div className="w-3 h-1.5 bg-white/80 rounded-sm" />
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="bg-[#001C55] px-5 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-white text-sm font-bold leading-none">SafeCampus</div>
              <div className="text-blue-200 text-[10px] leading-none mt-0.5">PUCP</div>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-blue-200 text-[10px] border border-blue-400/40 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            Cambiar rol
          </button>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto pb-20">
          <Outlet />
        </div>

        {/* Bottom nav */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-200 flex z-50">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${isActive ? 'text-[#001C55]' : 'text-gray-400'}`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-blue-50' : ''}`}>
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
