import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle, Clock, CheckCircle, MapPin, ChevronRight,
  Radio, Zap, Megaphone, ArrowRight
} from 'lucide-react';
import { mockIncidents } from '../../data/mockData';

const severityConfig: Record<string, { border: string; dot: string; badge: string; text: string }> = {
  critico: { border: 'border-red-500', dot: 'bg-red-500', badge: 'bg-red-500/20 text-red-400', text: 'text-red-400' },
  alto: { border: 'border-orange-400', dot: 'bg-orange-400', badge: 'bg-orange-500/20 text-orange-400', text: 'text-orange-400' },
  medio: { border: 'border-amber-400', dot: 'bg-amber-400', badge: 'bg-amber-400/20 text-amber-300', text: 'text-amber-300' },
  bajo: { border: 'border-green-500', dot: 'bg-green-500', badge: 'bg-green-500/20 text-green-400', text: 'text-green-400' },
};

const statusLabel: Record<string, string> = {
  nuevo: 'NUEVO',
  en_atencion: 'EN ATENCIÓN',
  pendiente: 'PENDIENTE',
  resuelto: 'RESUELTO',
  cerrado: 'CERRADO',
};

export default function OperadorDashboard() {
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [showSOS, setShowSOS] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const criticals = mockIncidents.filter(i => i.severity === 'critico' && !['cerrado', 'resuelto'].includes(i.status));
  const myActive = mockIncidents.filter(i => i.assignedTo === 'Jorge Salinas Torres' && !['cerrado'].includes(i.status));
  const newIncidents = mockIncidents.filter(i => i.status === 'nuevo');

  return (
    <div className="px-4 pt-4 pb-4 space-y-4">
      {/* Time & status */}
      <div className="bg-[#161b22] rounded-2xl p-4 border border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-white tabular-nums">
              {time.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-gray-400 text-xs mt-0.5">
              {time.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end mb-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 text-xs font-bold">EN SERVICIO</span>
            </div>
            <div className="text-gray-500 text-[10px]">Turno: 07:00 - 15:00</div>
            <div className="text-gray-500 text-[10px]">Jorge Salinas · OP-023</div>
          </div>
        </div>
      </div>

      {/* Critical alerts */}
      {criticals.length > 0 && (
        <div className="space-y-2">
          {criticals.map(inc => (
            <div key={inc.id} onClick={() => navigate('/operador/incidentes')}
              className="bg-red-900/20 border border-red-500/50 rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-transform">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-400 text-[10px] font-bold uppercase tracking-wider">⚠ Crítico · {inc.id}</span>
                  </div>
                  <div className="text-white text-sm font-bold line-clamp-1">{inc.title}</div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-red-300">
                    <MapPin className="w-3 h-3" />{inc.location}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-red-400 shrink-0 mt-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Mis activos', value: myActive.length, icon: Clock, color: 'text-orange-400 bg-orange-500/10' },
          { label: 'Sin asignar', value: newIncidents.length, icon: AlertTriangle, color: 'text-red-400 bg-red-500/10' },
          { label: 'Resueltos hoy', value: mockIncidents.filter(i => ['resuelto', 'cerrado'].includes(i.status)).length, icon: CheckCircle, color: 'text-green-400 bg-green-500/10' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#161b22] rounded-2xl p-3 border border-gray-800 text-center">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold text-white">{value}</div>
            <div className="text-gray-500 text-[10px] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* My active cases */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Mis casos activos</span>
          <button onClick={() => navigate('/operador/incidentes')} className="text-orange-400 text-[10px] font-semibold flex items-center gap-0.5">
            Ver todos <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-2">
          {myActive.slice(0, 3).map(inc => {
            const cfg = severityConfig[inc.severity];
            return (
              <div key={inc.id} onClick={() => navigate('/operador/incidentes')}
                className={`bg-[#161b22] rounded-2xl p-4 border-l-4 border border-gray-800 cursor-pointer active:scale-[0.98] transition-transform ${cfg.border}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${cfg.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-gray-500 text-[10px] font-mono">{inc.id}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{statusLabel[inc.status]}</span>
                    </div>
                    <div className="text-white text-sm font-semibold line-clamp-1">{inc.title}</div>
                    <div className="flex items-center gap-1 mt-1 text-gray-500 text-[10px]">
                      <MapPin className="w-3 h-3" />{inc.zone} · {inc.updatedAt.split(' ')[1]}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <span className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3 block">Acciones rápidas</span>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/operador/incidentes')} className="bg-orange-500 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.97] transition-transform">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="text-white font-bold text-sm">Nuevo caso</div>
              <div className="text-orange-200 text-[10px]">Reporte rápido</div>
            </div>
          </button>

          <button onClick={() => navigate('/operador/mapa')} className="bg-[#161b22] border border-gray-700 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.97] transition-transform">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-left">
              <div className="text-white font-bold text-sm">Ver mapa</div>
              <div className="text-gray-500 text-[10px]">Campus en vivo</div>
            </div>
          </button>

          <button onClick={() => setShowSOS(true)} className="bg-red-600 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.97] transition-transform col-span-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center animate-pulse">
              <Megaphone className="w-5 h-5 text-white" />
            </div>
            <div className="text-left flex-1">
              <div className="text-white font-bold text-sm">Alerta de Emergencia</div>
              <div className="text-red-200 text-[10px]">Activar protocolo de emergencia en campus</div>
            </div>
            <Radio className="w-4 h-4 text-red-200" />
          </button>
        </div>
      </div>

      {/* Radio status */}
      <div className="bg-[#161b22] border border-gray-800 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-500/15 rounded-xl flex items-center justify-center">
            <Radio className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="text-white text-xs font-bold">Canal de radio · Canal 3</div>
            <div className="text-gray-500 text-[10px]">3 operadores activos en frecuencia</div>
          </div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
        </div>
      </div>

      {/* SOS Modal */}
      {showSOS && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center p-4">
          <div className="bg-[#161b22] border border-red-500/50 rounded-3xl p-6 w-full max-w-[390px] text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Megaphone className="w-10 h-10 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">¿Activar alerta de emergencia?</h3>
            <p className="text-gray-400 text-xs mb-6 leading-relaxed">
              Esto activará el protocolo de emergencia del campus y notificará a todos los operadores y supervisores disponibles.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setShowSOS(false)}
                className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold text-base animate-pulse"
              >
                🚨 SÍ, ACTIVAR EMERGENCIA
              </button>
              <button onClick={() => setShowSOS(false)} className="w-full border border-gray-700 text-gray-400 py-3 rounded-2xl text-sm font-semibold">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
