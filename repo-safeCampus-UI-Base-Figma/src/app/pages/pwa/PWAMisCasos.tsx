import { useState } from 'react';
import type { ElementType } from 'react';
import { MapPin, Clock, ChevronRight, CheckCircle, AlertCircle, X, MessageSquare } from 'lucide-react';
import { mockIncidents, type Incident } from '../../data/mockData';

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: ElementType }> = {
  nuevo: { label: 'Nuevo', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: AlertCircle },
  en_atencion: { label: 'En atención', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: Clock },
  pendiente: { label: 'Pendiente', color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200', icon: Clock },
  resuelto: { label: 'Resuelto', color: 'text-green-600', bg: 'bg-green-50 border-green-200', icon: CheckCircle },
  cerrado: { label: 'Cerrado', color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', icon: CheckCircle },
};

const severityDot: Record<string, string> = {
  critico: 'bg-red-500',
  alto: 'bg-orange-400',
  medio: 'bg-amber-400',
  bajo: 'bg-green-400',
};

export default function PWAMisCasos() {
  const [selected, setSelected] = useState<Incident | null>(null);
  const userCases = mockIncidents.filter(i => i.reportedBy === 'María García López');

  if (selected) {
    const cfg = statusConfig[selected.status];
    const StatusIcon = cfg.icon;
    return (
      <div>
        <div className="px-4 pt-4 pb-3 flex items-center gap-3">
          <button onClick={() => setSelected(null)} className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
            <X className="w-4 h-4 text-gray-600" />
          </button>
          <div>
            <div className="text-xs text-gray-400">{selected.id}</div>
            <div className="text-sm font-bold text-gray-900 line-clamp-1">{selected.title}</div>
          </div>
        </div>

        <div className="px-4 space-y-4">
          {/* Status */}
          <div className={`rounded-2xl p-4 border ${cfg.bg}`}>
            <div className="flex items-center gap-2">
              <StatusIcon className={`w-5 h-5 ${cfg.color}`} />
              <div>
                <div className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</div>
                <div className="text-xs text-gray-500">Última actualización: {selected.updatedAt}</div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-3">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Detalles del incidente</div>
            <div className="space-y-2 text-xs text-gray-700">
              <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Tipo:</span><span className="font-medium capitalize">{selected.type.replace('_', ' ')}</span></div>
              <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Severidad:</span>
                <span className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${severityDot[selected.severity]}`} />
                  <span className="font-medium capitalize">{selected.severity}</span>
                </span>
              </div>
              <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Ubicación:</span><span className="font-medium">{selected.location}</span></div>
              <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Canal:</span><span className="font-medium capitalize">{selected.channel}</span></div>
              <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Reportado:</span><span className="font-medium">{selected.createdAt}</span></div>
              {selected.assignedTo && <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Asignado a:</span><span className="font-medium">{selected.assignedTo}</span></div>}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Descripción</div>
            <p className="text-xs text-gray-700 leading-relaxed">{selected.description}</p>
          </div>

          {/* Timeline */}
          {selected.history && (
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Historial de atención</div>
              <div className="relative pl-4">
                <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-gray-200" />
                {selected.history.map((h, i) => (
                  <div key={i} className="relative mb-4 pl-4">
                    <div className="absolute left-[-10px] top-1 w-3 h-3 bg-[#001C55] rounded-full border-2 border-white" />
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <div className="text-[10px] text-gray-400 mb-0.5">{h.time} · {h.by}</div>
                      <div className="text-xs font-medium text-gray-700">{h.action}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact */}
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 flex items-center gap-3">
            <div className="w-9 h-9 bg-[#001C55] rounded-xl flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#001C55]">¿Tienes más información?</div>
              <div className="text-xs text-blue-600">Puedes añadir detalles adicionales al caso.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 pt-4 pb-3">
        <h2 className="text-lg font-bold text-gray-900">Mis reportes</h2>
        <p className="text-xs text-gray-500 mt-0.5">{userCases.length} incidente{userCases.length !== 1 ? 's' : ''} registrado{userCases.length !== 1 ? 's' : ''}</p>
      </div>

      {userCases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
            <CheckCircle className="w-8 h-8 text-gray-300" />
          </div>
          <div className="text-sm font-semibold text-gray-600 mb-1">Sin reportes activos</div>
          <div className="text-xs text-gray-400">Tus reportes de incidentes aparecerán aquí.</div>
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {userCases.map(incident => {
            const cfg = statusConfig[incident.status];
            const StatusIcon = cfg.icon;
            return (
              <button
                key={incident.id}
                onClick={() => setSelected(incident)}
                className="w-full bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-left active:scale-[0.98] transition-transform hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1 ${severityDot[incident.severity]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-bold text-gray-400">{incident.id}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.color} ${cfg.bg.split(' ')[0]}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-gray-800 line-clamp-2 mb-2">{incident.title}</div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{incident.zone}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{incident.createdAt.split(' ')[0]}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}