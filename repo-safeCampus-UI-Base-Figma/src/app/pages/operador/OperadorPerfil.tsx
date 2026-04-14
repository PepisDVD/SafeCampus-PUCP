import { useNavigate } from 'react-router';
import {
  Shield, Phone, Radio, Clock, CheckCircle, MapPin,
  Settings, Bell, LogOut, Activity
} from 'lucide-react';
import { mockIncidents } from '../../data/mockData';

export default function OperadorPerfil() {
  const navigate = useNavigate();
  const myIncidents = mockIncidents.filter(i => i.assignedTo === 'Jorge Salinas Torres');
  const resolved = myIncidents.filter(i => ['resuelto', 'cerrado'].includes(i.status));

  const stats = [
    { label: 'Casos asignados', value: myIncidents.length, color: 'text-orange-400' },
    { label: 'Resueltos', value: resolved.length, color: 'text-green-400' },
    { label: 'FRT promedio', value: '3.8m', color: 'text-blue-400' },
    { label: 'Horas en turno', value: '6h', color: 'text-purple-400' },
  ];

  return (
    <div className="px-4 pt-4 pb-8 space-y-4">
      {/* Profile card */}
      <div className="bg-[#161b22] border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center">
            <span className="text-2xl font-bold text-orange-400">JS</span>
          </div>
          <div>
            <div className="text-white text-base font-bold">Jorge Salinas Torres</div>
            <div className="text-orange-400 text-xs font-semibold mt-0.5 flex items-center gap-1.5">
              <Shield className="w-3 h-3" /> Operador de Seguridad
            </div>
            <div className="text-gray-500 text-[10px] mt-1">Código: OP-023 · Turno Mañana</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 pt-4 border-t border-gray-800">
          {stats.map(stat => (
            <div key={stat.label} className="text-center">
              <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-gray-600 text-[9px] mt-0.5 leading-tight">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="bg-[#161b22] border border-gray-800 rounded-2xl overflow-hidden">
        {[
          { icon: Phone, label: 'Teléfono de turno', value: '+51 999 888 777' },
          { icon: Radio, label: 'Canal de radio', value: 'Canal 3 · Frecuencia A' },
          { icon: MapPin, label: 'Zona asignada', value: 'Zonas Central y Ciencias' },
          { icon: Clock, label: 'Turno actual', value: '07:00 - 15:00 · Lun-Vie' },
          { icon: Activity, label: 'Estado en sistema', value: 'En servicio' },
        ].map(({ icon: Icon, label, value }, i) => (
          <div key={label} className={`flex items-center gap-3 px-4 py-3.5 ${i < 4 ? 'border-b border-gray-800' : ''}`}>
            <div className="w-8 h-8 bg-gray-800 rounded-xl flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-gray-600 text-[10px]">{label}</div>
              <div className="text-white text-xs font-semibold">{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Today's activity */}
      <div>
        <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">Actividad de hoy</div>
        <div className="space-y-2">
          {myIncidents.slice(0, 3).map(inc => (
            <div key={inc.id} className="bg-[#161b22] border border-gray-800 rounded-2xl p-3 flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full shrink-0 ${inc.status === 'en_atencion' ? 'bg-amber-400 animate-pulse' : inc.status === 'cerrado' ? 'bg-gray-600' : 'bg-green-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-white text-xs font-semibold line-clamp-1">{inc.title}</div>
                <div className="text-gray-600 text-[10px]">{inc.id} · {inc.createdAt.split(' ')[1]}</div>
              </div>
              {['resuelto', 'cerrado'].includes(inc.status) && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="bg-[#161b22] border border-gray-800 rounded-2xl overflow-hidden">
        {[
          { icon: Bell, label: 'Notificaciones de turno', value: 'Activadas' },
          { icon: Settings, label: 'Preferencias de app', value: '' },
        ].map(({ icon: Icon, label, value }, i) => (
          <button key={label} className={`w-full flex items-center gap-3 px-4 py-3.5 ${i < 1 ? 'border-b border-gray-800' : ''}`}>
            <div className="w-8 h-8 bg-gray-800 rounded-xl flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-gray-400" />
            </div>
            <span className="flex-1 text-white text-xs font-semibold text-left">{label}</span>
            {value && <span className="text-green-400 text-[10px] font-semibold">{value}</span>}
          </button>
        ))}
      </div>

      <button
        onClick={() => navigate('/')}
        className="w-full flex items-center justify-center gap-2 bg-red-900/30 border border-red-700/50 text-red-400 py-3.5 rounded-2xl font-semibold text-sm"
      >
        <LogOut className="w-4 h-4" />
        Finalizar turno y cerrar sesión
      </button>
    </div>
  );
}
