import { useNavigate } from 'react-router';
import type { ElementType } from 'react';
import {
  AlertTriangle, Package, Navigation, Bell, ChevronRight,
  CheckCircle, Clock, AlertCircle, Shield, MapPin, Megaphone
} from 'lucide-react';
import { mockNotifications, mockIncidents } from '../../data/mockData';

const quickActions = [
  {
    icon: AlertTriangle,
    label: 'Reportar\nIncidente',
    path: '/pwa/reportar',
    color: 'bg-red-500',
    light: 'bg-red-50 text-red-600',
  },
  {
    icon: Navigation,
    label: 'Acompañamiento\nSeguro',
    path: '/pwa/acompanamiento',
    color: 'bg-[#001C55]',
    light: 'bg-blue-50 text-blue-700',
  },
  {
    icon: Package,
    label: 'Lost &\nFound',
    path: '/pwa/lost-found',
    color: 'bg-amber-500',
    light: 'bg-amber-50 text-amber-600',
  },
  {
    icon: Bell,
    label: 'Notifica-\nciones',
    path: '/pwa/perfil',
    color: 'bg-purple-500',
    light: 'bg-purple-50 text-purple-600',
  },
];

const statusConfig: Record<string, { label: string; color: string; icon: ElementType }> = {
  nuevo: { label: 'Nuevo', color: 'text-blue-600 bg-blue-50', icon: AlertCircle },
  en_atencion: { label: 'En atención', color: 'text-amber-600 bg-amber-50', icon: Clock },
  pendiente: { label: 'Pendiente', color: 'text-orange-600 bg-orange-50', icon: Clock },
  resuelto: { label: 'Resuelto', color: 'text-green-600 bg-green-50', icon: CheckCircle },
  cerrado: { label: 'Cerrado', color: 'text-gray-500 bg-gray-100', icon: CheckCircle },
};

export default function PWAHome() {
  const navigate = useNavigate();
  const userIncidents = mockIncidents.filter(i => i.reportedBy === 'María García López');
  const unread = mockNotifications.filter(n => !n.read).length;

  return (
    <div className="pb-4">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-[#001C55] to-[#003087] mx-4 mt-4 rounded-2xl p-5 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
        <div className="absolute right-8 bottom-0 w-16 h-16 bg-white/5 rounded-full translate-y-6" />
        <div className="relative z-10">
          <div className="text-xs text-blue-200 mb-1">Bienvenida, María 👋</div>
          <div className="text-base font-bold mb-3">¿Qué necesitas hoy?</div>
          {unread > 0 && (
            <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2 text-xs">
              <Bell className="w-3.5 h-3.5 text-yellow-300" />
              <span>Tienes <span className="font-bold text-yellow-300">{unread} notificaciones</span> sin leer</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-4 mt-5">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Acciones rápidas</h3>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map(({ icon: Icon, label, path, color, light }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-2 group"
            >
              <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center shadow-md group-active:scale-95 transition-transform`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] text-gray-600 text-center leading-tight whitespace-pre-line">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* SOS Button */}
      <div className="px-4 mt-5">
        <button
          onClick={() => navigate('/pwa/acompanamiento')}
          className="w-full bg-red-600 hover:bg-red-700 active:scale-95 transition-all rounded-2xl py-4 flex items-center justify-center gap-3 shadow-lg shadow-red-200"
        >
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <div className="text-white font-bold text-sm">Botón de Emergencia SOS</div>
            <div className="text-red-200 text-[10px]">Alerta inmediata al equipo de seguridad</div>
          </div>
        </button>
      </div>

      {/* Campus alerts */}
      <div className="px-4 mt-5">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-amber-800">Alerta de Campus</span>
            <span className="ml-auto text-[9px] text-amber-500 bg-amber-100 px-2 py-0.5 rounded-full">Activa</span>
          </div>
          <p className="text-xs text-amber-700 leading-relaxed">
            Mayor vigilancia en <strong>Pabellón H</strong> y zona de estacionamiento. Mantenga sus pertenencias seguras.
          </p>
          <div className="flex items-center gap-1 mt-2 text-[10px] text-amber-500">
            <MapPin className="w-3 h-3" />
            <span>Zona Ciencias · Zona Ingreso</span>
          </div>
        </div>
      </div>

      {/* My recent cases */}
      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mis reportes recientes</h3>
          <button onClick={() => navigate('/pwa/mis-casos')} className="text-[#001C55] text-[11px] font-semibold flex items-center gap-0.5">
            Ver todos <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-3">
          {userIncidents.slice(0, 2).map(incident => {
            const cfg = statusConfig[incident.status];
            const StatusIcon = cfg.icon;
            return (
              <div key={incident.id} onClick={() => navigate('/pwa/mis-casos')} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 active:scale-[0.98] transition-transform cursor-pointer">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <div className="text-xs font-bold text-[#001C55]">{incident.id}</div>
                    <div className="text-sm font-semibold text-gray-800 mt-0.5 line-clamp-1">{incident.title}</div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${cfg.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {cfg.label}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-gray-400">
                  <MapPin className="w-3 h-3" />
                  <span>{incident.location}</span>
                  <span className="ml-auto">{incident.createdAt.split(' ')[1]}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tips */}
      <div className="px-4 mt-5">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Consejos de seguridad</h3>
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-[#001C55] rounded-xl flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#001C55] mb-1">¿Sabías que?</div>
              <p className="text-xs text-blue-700 leading-relaxed">
                Puedes usar el <strong>acompañamiento seguro</strong> para que seguridad monitoree tu trayecto dentro del campus. Solo configura tu destino y actívalo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}