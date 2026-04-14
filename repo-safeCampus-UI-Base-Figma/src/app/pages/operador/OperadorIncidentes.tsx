import { useState } from 'react';
import {
  Search, MapPin, Clock, ChevronRight, X, CheckCircle,
  ArrowUpCircle, MessageSquare, User, Camera, Filter
} from 'lucide-react';
import { mockIncidents, type Incident } from '../../data/mockData';

const severityConfig: Record<string, { border: string; dot: string; badge: string }> = {
  critico: { border: 'border-l-red-500', dot: 'bg-red-500', badge: 'bg-red-500/20 text-red-400' },
  alto: { border: 'border-l-orange-400', dot: 'bg-orange-400', badge: 'bg-orange-500/20 text-orange-400' },
  medio: { border: 'border-l-amber-400', dot: 'bg-amber-400', badge: 'bg-amber-400/20 text-amber-300' },
  bajo: { border: 'border-l-green-500', dot: 'bg-green-500', badge: 'bg-green-500/20 text-green-400' },
};

const statusOptions = [
  { value: 'todos', label: 'Todos' },
  { value: 'nuevo', label: 'Nuevo' },
  { value: 'en_atencion', label: 'En atención' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'resuelto', label: 'Resuelto' },
];

const statusLabel: Record<string, string> = {
  nuevo: 'NUEVO',
  en_atencion: 'EN ATENCIÓN',
  pendiente: 'PENDIENTE',
  resuelto: 'RESUELTO',
  cerrado: 'CERRADO',
};

const statusBadgeColor: Record<string, string> = {
  nuevo: 'text-blue-400 bg-blue-500/20',
  en_atencion: 'text-amber-400 bg-amber-500/20',
  pendiente: 'text-orange-400 bg-orange-500/20',
  resuelto: 'text-green-400 bg-green-500/20',
  cerrado: 'text-gray-400 bg-gray-500/20',
};

export default function OperadorIncidentes() {
  const [selected, setSelected] = useState<Incident | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterMine, setFilterMine] = useState(false);
  const [newNote, setNewNote] = useState('');

  const filtered = mockIncidents.filter(inc => {
    if (filterStatus !== 'todos' && inc.status !== filterStatus) return false;
    if (filterMine && inc.assignedTo !== 'Jorge Salinas Torres') return false;
    if (search && !inc.title.toLowerCase().includes(search.toLowerCase()) && !inc.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (selected) {
    const cfg = severityConfig[selected.severity];
    return (
      <div className="flex flex-col min-h-full">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-gray-800">
          <button onClick={() => setSelected(null)} className="w-8 h-8 bg-gray-800 rounded-xl flex items-center justify-center">
            <X className="w-4 h-4 text-gray-400" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-gray-500 text-[10px] font-mono">{selected.id}</div>
            <div className="text-white text-sm font-bold line-clamp-1">{selected.title}</div>
          </div>
          <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot} ${selected.severity === 'critico' ? 'animate-pulse' : ''}`} />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Status & Severity */}
          <div className="flex gap-3">
            <div className="flex-1 bg-[#161b22] rounded-2xl p-3 border border-gray-800">
              <div className="text-gray-500 text-[9px] font-bold uppercase mb-1">Estado</div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${statusBadgeColor[selected.status]}`}>{statusLabel[selected.status]}</span>
            </div>
            <div className="flex-1 bg-[#161b22] rounded-2xl p-3 border border-gray-800">
              <div className="text-gray-500 text-[9px] font-bold uppercase mb-1">Severidad</div>
              <div className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                <span className="text-white text-[11px] font-bold capitalize">{selected.severity}</span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="bg-[#161b22] rounded-2xl p-4 border border-gray-800 space-y-3">
            {[
              { label: 'Tipo', value: selected.type.replace('_', ' ') },
              { label: 'Ubicación', value: selected.location },
              { label: 'Zona', value: selected.zone },
              { label: 'Canal', value: selected.channel },
              { label: 'Reportado por', value: selected.reportedBy },
              { label: 'Asignado a', value: selected.assignedTo || 'Sin asignar' },
              { label: 'Registrado', value: selected.createdAt },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-2">
                <span className="text-gray-600 text-[10px] font-semibold uppercase w-24 shrink-0">{label}</span>
                <span className="text-gray-300 text-xs font-medium capitalize text-right">{value}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="bg-[#161b22] rounded-2xl p-4 border border-gray-800">
            <div className="text-gray-500 text-[9px] font-bold uppercase mb-2">Descripción</div>
            <p className="text-gray-300 text-xs leading-relaxed">{selected.description}</p>
          </div>

          {/* History */}
          {selected.history && (
            <div>
              <div className="text-gray-500 text-[9px] font-bold uppercase mb-2">Historial</div>
              <div className="space-y-2">
                {selected.history.map((h, i) => (
                  <div key={i} className="flex gap-3 bg-[#161b22] rounded-xl p-3 border border-gray-800">
                    <div className="text-gray-600 text-[10px] font-mono w-10 shrink-0">{h.time}</div>
                    <div className="flex-1">
                      <div className="text-gray-300 text-xs">{h.action}</div>
                      <div className="text-gray-600 text-[10px] mt-0.5">{h.by}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <div className="text-gray-500 text-[9px] font-bold uppercase mb-2">Agregar nota</div>
            <textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              rows={3}
              placeholder="Escribe una actualización operativa..."
              className="w-full bg-[#161b22] border border-gray-700 rounded-2xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 resize-none"
            />
            <div className="flex gap-2 mt-2">
              <button className="flex-1 flex items-center justify-center gap-1.5 bg-gray-800 text-gray-300 py-2.5 rounded-xl text-xs font-semibold">
                <Camera className="w-3.5 h-3.5" /> Foto
              </button>
              <button className="flex-1 bg-orange-500 text-white py-2.5 rounded-xl text-xs font-bold">
                Guardar nota
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-800 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <button className="flex flex-col items-center gap-1 py-3 bg-[#161b22] border border-gray-700 rounded-2xl text-xs font-semibold text-gray-300 hover:border-gray-500 transition-colors">
              <User className="w-4 h-4 text-blue-400" />
              <span className="text-[10px]">Asignar</span>
            </button>
            <button className="flex flex-col items-center gap-1 py-3 bg-[#161b22] border border-amber-600/30 rounded-2xl text-xs font-semibold text-amber-400 hover:border-amber-600 transition-colors">
              <ArrowUpCircle className="w-4 h-4" />
              <span className="text-[10px]">Escalar</span>
            </button>
            <button className="flex flex-col items-center gap-1 py-3 bg-[#161b22] border border-gray-700 rounded-2xl text-xs font-semibold text-gray-300 hover:border-gray-500 transition-colors">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              <span className="text-[10px]">Notificar</span>
            </button>
          </div>
          <button className="w-full flex items-center justify-center gap-2 py-3.5 bg-green-600 rounded-2xl text-white text-sm font-bold">
            <CheckCircle className="w-4 h-4" /> Marcar como resuelto
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 pt-4 pb-3">
        <h2 className="text-lg font-bold text-white">Incidentes</h2>
        <p className="text-gray-500 text-xs mt-0.5">{filtered.length} casos encontrados</p>
      </div>

      {/* Filters */}
      <div className="px-4 space-y-3 mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por ID o título..."
            className="w-full pl-10 pr-4 py-3 bg-[#161b22] border border-gray-800 rounded-2xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {statusOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterStatus(opt.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all shrink-0 ${filterStatus === opt.value ? 'bg-orange-500 text-white border-orange-500' : 'bg-[#161b22] text-gray-500 border-gray-800 hover:border-gray-700'}`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => setFilterMine(!filterMine)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all shrink-0 flex items-center gap-1 ${filterMine ? 'bg-blue-600 text-white border-blue-600' : 'bg-[#161b22] text-gray-500 border-gray-800'}`}
          >
            <Filter className="w-3 h-3" /> Mis casos
          </button>
        </div>
      </div>

      {/* List */}
      <div className="px-4 space-y-2 pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="text-gray-600 text-4xl mb-3">📭</div>
            <div className="text-gray-500 text-sm font-semibold">Sin incidentes</div>
            <div className="text-gray-600 text-xs">Prueba con otros filtros</div>
          </div>
        ) : (
          filtered.map(inc => {
            const cfg = severityConfig[inc.severity];
            return (
              <button
                key={inc.id}
                onClick={() => setSelected(inc)}
                className={`w-full bg-[#161b22] border border-gray-800 border-l-4 ${cfg.border} rounded-2xl p-4 text-left active:scale-[0.98] transition-transform hover:border-gray-700 hover:border-l-4`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${cfg.dot} ${inc.severity === 'critico' ? 'animate-pulse' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-gray-500 text-[10px] font-mono">{inc.id}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusBadgeColor[inc.status]}`}>{statusLabel[inc.status]}</span>
                      <span className="ml-auto text-[9px] text-gray-600 capitalize">{inc.channel}</span>
                    </div>
                    <div className="text-white text-sm font-semibold line-clamp-2 mb-1">{inc.title}</div>
                    <div className="flex items-center gap-3 text-gray-600 text-[10px]">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{inc.zone}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{inc.createdAt.split(' ')[1]}</span>
                      {inc.assignedTo && <span className="flex items-center gap-1"><User className="w-3 h-3" />{inc.assignedTo.split(' ')[0]}</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-700 shrink-0 mt-1" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
