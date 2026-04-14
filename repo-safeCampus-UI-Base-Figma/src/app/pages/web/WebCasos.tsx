import { useState } from 'react';
import {
  Search, Filter, X, MapPin, Clock, User, MessageSquare,
  ChevronRight, CheckCircle, AlertCircle, ArrowUpCircle, Eye
} from 'lucide-react';
import { mockIncidents, type Incident } from '../../data/mockData';

const severityColor: Record<string, string> = {
  critico: 'border-l-red-500 bg-red-50/30',
  alto: 'border-l-orange-400 bg-orange-50/20',
  medio: 'border-l-amber-400',
  bajo: 'border-l-green-400',
};

const severityDot: Record<string, string> = {
  critico: 'bg-red-500',
  alto: 'bg-orange-400',
  medio: 'bg-amber-400',
  bajo: 'bg-green-400',
};

const statusConfig: Record<string, { label: string; color: string }> = {
  nuevo: { label: 'Nuevo', color: 'bg-blue-100 text-blue-700' },
  en_atencion: { label: 'En atención', color: 'bg-amber-100 text-amber-700' },
  pendiente: { label: 'Pendiente', color: 'bg-orange-100 text-orange-700' },
  resuelto: { label: 'Resuelto', color: 'bg-green-100 text-green-700' },
  cerrado: { label: 'Cerrado', color: 'bg-gray-100 text-gray-600' },
};

const statusCols = ['nuevo', 'en_atencion', 'pendiente', 'resuelto', 'cerrado'];
const statusColLabels: Record<string, string> = {
  nuevo: 'Nuevo',
  en_atencion: 'En atención',
  pendiente: 'Pendiente',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
};

export default function WebCasos() {
  const [view, setView] = useState<'tabla' | 'kanban'>('tabla');
  const [selected, setSelected] = useState<Incident | null>(null);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');

  const filtered = mockIncidents.filter(inc => {
    if (search && !inc.title.toLowerCase().includes(search.toLowerCase()) && !inc.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterSeverity !== 'todos' && inc.severity !== filterSeverity) return false;
    if (filterStatus !== 'todos' && inc.status !== filterStatus) return false;
    return true;
  });

  // Detail panel
  const DetailPanel = ({ inc }: { inc: Incident }) => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-5 border-b border-gray-100">
        <div>
          <div className="text-xs text-gray-400 font-bold">{inc.id}</div>
          <h3 className="text-sm font-bold text-gray-900 mt-0.5">{inc.title}</h3>
        </div>
        <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Status & severity */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] text-gray-400 mb-1 font-semibold uppercase">Estado</div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-xl ${statusConfig[inc.status].color}`}>{statusConfig[inc.status].label}</span>
          </div>
          <div>
            <div className="text-[10px] text-gray-400 mb-1 font-semibold uppercase">Severidad</div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${severityDot[inc.severity]}`} />
              <span className="text-xs font-semibold capitalize text-gray-700">{inc.severity}</span>
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
          {[
            { label: 'Tipo', value: inc.type.replace('_', ' '), capitalize: true },
            { label: 'Zona', value: inc.zone },
            { label: 'Ubicación', value: inc.location },
            { label: 'Canal', value: inc.channel, capitalize: true },
            { label: 'Reportado por', value: inc.reportedBy },
            { label: 'Asignado a', value: inc.assignedTo || 'Sin asignar' },
            { label: 'Registrado', value: inc.createdAt },
            { label: 'Actualizado', value: inc.updatedAt },
          ].map(({ label, value, capitalize }) => (
            <div key={label} className="flex justify-between gap-3">
              <span className="text-[10px] text-gray-400 font-semibold uppercase w-24 shrink-0">{label}</span>
              <span className={`text-xs text-gray-700 font-medium text-right ${capitalize ? 'capitalize' : ''}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Description */}
        <div>
          <div className="text-[10px] text-gray-400 font-semibold uppercase mb-2">Descripción</div>
          <p className="text-xs text-gray-700 leading-relaxed bg-white rounded-xl p-3 border border-gray-100">{inc.description}</p>
        </div>

        {/* History */}
        {inc.history && (
          <div>
            <div className="text-[10px] text-gray-400 font-semibold uppercase mb-3">Historial</div>
            <div className="space-y-2">
              {inc.history.map((h, i) => (
                <div key={i} className="flex gap-3 text-xs">
                  <div className="w-14 text-gray-400 shrink-0">{h.time}</div>
                  <div className="flex-1">
                    <span className="font-semibold text-gray-700">{h.action}</span>
                    <span className="text-gray-400"> · {h.by}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comment */}
        <div>
          <div className="text-[10px] text-gray-400 font-semibold uppercase mb-2">Agregar comentario</div>
          <textarea rows={3} placeholder="Escribe una actualización del caso..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#001C55] resize-none bg-gray-50" />
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-100 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button className="flex items-center justify-center gap-1.5 py-2 bg-amber-500 text-white rounded-xl text-xs font-semibold hover:bg-amber-600 transition-colors">
            <ArrowUpCircle className="w-3.5 h-3.5" /> Escalar
          </button>
          <button className="flex items-center justify-center gap-1.5 py-2 bg-green-600 text-white rounded-xl text-xs font-semibold hover:bg-green-700 transition-colors">
            <CheckCircle className="w-3.5 h-3.5" /> Cerrar caso
          </button>
        </div>
        <button className="w-full flex items-center justify-center gap-1.5 py-2 border border-[#001C55] text-[#001C55] rounded-xl text-xs font-semibold hover:bg-blue-50 transition-colors">
          <MessageSquare className="w-3.5 h-3.5" /> Notificar al reportante
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className={`flex-1 flex flex-col overflow-hidden ${selected ? 'hidden xl:flex' : 'flex'}`}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 bg-white shrink-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Gestión de Casos</h1>
              <p className="text-xs text-gray-400">{filtered.length} incidente{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex bg-gray-100 rounded-xl p-1">
                {(['tabla', 'kanban'] as const).map(v => (
                  <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mt-3 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por ID o título..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#001C55] bg-gray-50"
              />
            </div>
            <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#001C55]">
              <option value="todos">Todas las severidades</option>
              <option value="critico">Crítico</option>
              <option value="alto">Alto</option>
              <option value="medio">Medio</option>
              <option value="bajo">Bajo</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#001C55]">
              <option value="todos">Todos los estados</option>
              <option value="nuevo">Nuevo</option>
              <option value="en_atencion">En atención</option>
              <option value="pendiente">Pendiente</option>
              <option value="resuelto">Resuelto</option>
              <option value="cerrado">Cerrado</option>
            </select>
          </div>
        </div>

        {/* TABLA VIEW */}
        {view === 'tabla' && (
          <div className="flex-1 overflow-auto p-4">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['ID', 'Incidente', 'Zona', 'Severidad', 'Estado', 'Asignado a', 'Registrado', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inc => (
                    <tr key={inc.id} onClick={() => setSelected(inc)} className={`border-b border-gray-50 hover:bg-blue-50/30 cursor-pointer transition-colors border-l-4 ${severityColor[inc.severity]}`}>
                      <td className="px-4 py-3 text-[11px] font-bold text-[#001C55] whitespace-nowrap">{inc.id}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-semibold text-gray-800 max-w-[220px] truncate">{inc.title}</div>
                        <div className="text-[10px] text-gray-400 capitalize">{inc.type.replace('_', ' ')}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        <div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-400" />{inc.zone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${severityDot[inc.severity]}`} />
                          <span className="text-xs capitalize">{inc.severity}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${statusConfig[inc.status].color}`}>{statusConfig[inc.status].label}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        {inc.assignedTo ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 bg-[#001C55] rounded-full flex items-center justify-center text-[8px] text-white font-bold">
                              {inc.assignedTo.split(' ').map(n => n[0]).slice(0,2).join('')}
                            </div>
                            <span>{inc.assignedTo.split(' ')[0]}</span>
                          </div>
                        ) : <span className="text-gray-300">Sin asignar</span>}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-gray-400 whitespace-nowrap">{inc.createdAt}</td>
                      <td className="px-4 py-3">
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#001C55] transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* KANBAN VIEW */}
        {view === 'kanban' && (
          <div className="flex-1 overflow-x-auto p-4">
            <div className="flex gap-3 h-full" style={{ minWidth: `${statusCols.length * 280}px` }}>
              {statusCols.map(status => {
                const colIncidents = filtered.filter(i => i.status === status);
                return (
                  <div key={status} className="flex-1 min-w-[260px] flex flex-col bg-gray-100 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-xl ${statusConfig[status].color}`}>{statusColLabels[status]}</span>
                      <span className="ml-auto text-xs font-bold text-gray-400">{colIncidents.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                      {colIncidents.map(inc => (
                        <div
                          key={inc.id}
                          onClick={() => setSelected(inc)}
                          className={`bg-white rounded-xl p-3 border-l-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${severityColor[inc.severity]}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-gray-400">{inc.id}</span>
                            <div className={`w-2 h-2 rounded-full ml-auto ${severityDot[inc.severity]}`} />
                          </div>
                          <div className="text-xs font-semibold text-gray-800 line-clamp-2 mb-2">{inc.title}</div>
                          <div className="flex items-center gap-1 text-[10px] text-gray-400">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{inc.zone}</span>
                          </div>
                          {inc.assignedTo && (
                            <div className="flex items-center gap-1 mt-1.5 text-[10px] text-gray-400">
                              <User className="w-3 h-3" />
                              <span>{inc.assignedTo.split(' ')[0]}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>{inc.createdAt.split(' ')[1]}</span>
                          </div>
                        </div>
                      ))}
                      {colIncidents.length === 0 && (
                        <div className="flex items-center justify-center h-20 text-xs text-gray-300">Sin incidentes</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-full xl:w-[380px] shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          <DetailPanel inc={selected} />
        </div>
      )}
    </div>
  );
}
