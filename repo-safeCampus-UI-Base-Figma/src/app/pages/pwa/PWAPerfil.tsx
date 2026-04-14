import { useNavigate } from 'react-router';
import type { ElementType } from 'react';
import {
  User, Mail, Building, Hash, Bell, Shield, ChevronRight,
  LogOut, CheckCircle, Clock, AlertCircle, Phone
} from 'lucide-react';
import { mockNotifications, mockIncidents } from '../../data/mockData';

export default function PWAPerfil() {
  const navigate = useNavigate();
  const userCases = mockIncidents.filter(i => i.reportedBy === 'María García López');
  const unread = mockNotifications.filter(n => !n.read).length;

  const notifTypeIcon: Record<string, ElementType> = {
    success: CheckCircle,
    info: AlertCircle,
    warning: AlertCircle,
  };

  const notifTypeColor: Record<string, string> = {
    success: 'text-green-500 bg-green-50',
    info: 'text-blue-500 bg-blue-50',
    warning: 'text-amber-500 bg-amber-50',
  };

  return (
    <div>
      {/* Profile header */}
      <div className="bg-gradient-to-br from-[#001C55] to-[#003087] mx-4 mt-4 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white">
            MG
          </div>
          <div>
            <div className="text-base font-bold">María García López</div>
            <div className="text-blue-200 text-xs">Estudiante · Ingeniería Informática</div>
            <div className="text-blue-300 text-[10px] mt-1">a20201234@pucp.edu.pe</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/20">
          {[
            { label: 'Reportes', value: userCases.length },
            { label: 'Activos', value: userCases.filter(c => ['nuevo', 'en_atencion', 'pendiente'].includes(c.status)).length },
            { label: 'Resueltos', value: userCases.filter(c => ['resuelto', 'cerrado'].includes(c.status)).length },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-xl font-bold text-white">{stat.value}</div>
              <div className="text-[10px] text-blue-300">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="px-4 mt-4">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Información personal</div>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {[
            { icon: Hash, label: 'Código', value: '20201234' },
            { icon: Building, label: 'Facultad', value: 'Ciencias e Ingeniería' },
            { icon: Mail, label: 'Correo', value: 'a20201234@pucp.edu.pe' },
            { icon: Phone, label: 'Teléfono', value: '+51 999 123 456' },
            { icon: Shield, label: 'Rol en sistema', value: 'Usuario comunidad' },
          ].map(({ icon: Icon, label, value }, i) => (
            <div key={label} className={`flex items-center gap-3 px-4 py-3 ${i < 4 ? 'border-b border-gray-50' : ''}`}>
              <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-gray-400">{label}</div>
                <div className="text-xs font-semibold text-gray-700 truncate">{value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Notificaciones</div>
          {unread > 0 && (
            <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">{unread} nuevas</span>
          )}
        </div>
        <div className="space-y-2">
          {mockNotifications.slice(0, 4).map(notif => {
            const Icon = notifTypeIcon[notif.type];
            const colorClass = notifTypeColor[notif.type];
            return (
              <div key={notif.id} className={`bg-white rounded-2xl p-3 border ${notif.read ? 'border-gray-100' : 'border-blue-100 bg-blue-50/40'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-gray-800">{notif.title}</span>
                      {!notif.read && <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{notif.body}</p>
                    <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />{notif.time}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Settings */}
      <div className="px-4 mt-4">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Preferencias</div>
        <div className="bg-white rounded-2xl border border-gray-100">
          {[
            { icon: Bell, label: 'Notificaciones push', value: 'Activadas' },
            { icon: Shield, label: 'Privacidad y datos', value: '' },
            { icon: User, label: 'Editar perfil', value: '' },
          ].map(({ icon: Icon, label, value }, i) => (
            <button key={label} className={`w-full flex items-center gap-3 px-4 py-3.5 ${i < 2 ? 'border-b border-gray-50' : ''}`}>
              <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-gray-500" />
              </div>
              <span className="flex-1 text-xs font-semibold text-gray-700 text-left">{label}</span>
              {value && <span className="text-[11px] text-gray-400">{value}</span>}
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div className="px-4 mt-4 mb-4">
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center justify-center gap-2 bg-red-50 border border-red-200 text-red-600 py-3.5 rounded-2xl font-semibold text-sm"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}