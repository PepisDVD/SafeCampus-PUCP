import { useState } from 'react';
import {
  AlertTriangle, CheckCircle, Clock, TrendingUp,
  MapPin, Filter, RefreshCw, Eye, ArrowUpRight
} from 'lucide-react';
import { mockIncidents } from '../../data/mockData';

const severityColor: Record<string, string> = {
  critico: 'bg-red-500',
  alto: 'bg-orange-400',
  medio: 'bg-amber-400',
  bajo: 'bg-green-400',
};

const statusBadge: Record<string, string> = {
  nuevo: 'bg-blue-100 text-blue-700',
  en_atencion: 'bg-amber-100 text-amber-700',
  pendiente: 'bg-orange-100 text-orange-700',
  resuelto: 'bg-green-100 text-green-700',
  cerrado: 'bg-gray-100 text-gray-600',
};

const statusLabel: Record<string, string> = {
  nuevo: 'Nuevo',
  en_atencion: 'En atención',
  pendiente: 'Pendiente',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
};

const channelIcon: Record<string, string> = {
  web: '🌐',
  movil: '📱',
  whatsapp: '💬',
  presencial: '🧑',
};

// Campus Map Component
function CampusMap({ incidents }: { incidents: typeof mockIncidents }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const active = incidents.filter(i => !['cerrado', 'resuelto'].includes(i.status));

  const severityMapColor: Record<string, string> = {
    critico: '#EF4444',
    alto: '#F97316',
    medio: '#EAB308',
    bajo: '#22C55E',
  };

  return (
    <div className="relative w-full bg-[#f0f7f0] rounded-2xl overflow-hidden border border-gray-200" style={{ height: '340px' }}>
      <svg viewBox="0 0 600 340" className="w-full h-full">
        {/* Background */}
        <rect width="600" height="340" fill="#e8f5e9" />
        <rect x="0" y="0" width="600" height="340" fill="url(#grid)" opacity="0.3" />
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#c8e6c9" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Green spaces */}
        <ellipse cx="300" cy="170" rx="80" ry="50" fill="#a5d6a7" opacity="0.5" />
        <ellipse cx="100" cy="300" rx="60" ry="30" fill="#c8e6c9" opacity="0.6" />
        <ellipse cx="500" cy="280" rx="70" ry="40" fill="#c8e6c9" opacity="0.6" />

        {/* Roads */}
        <rect x="270" y="0" width="20" height="340" fill="#cfd8dc" />
        <rect x="0" y="150" width="600" height="18" fill="#cfd8dc" />
        <rect x="0" y="260" width="600" height="14" fill="#e0e0e0" opacity="0.8" />
        <rect x="80" y="0" width="14" height="340" fill="#e0e0e0" opacity="0.7" />
        <rect x="480" y="0" width="14" height="340" fill="#e0e0e0" opacity="0.7" />

        {/* Buildings */}
        {/* Biblioteca Central */}
        <rect x="150" y="60" width="90" height="60" rx="5" fill="#bbdefb" stroke="#90caf9" strokeWidth="2" />
        <text x="195" y="95" textAnchor="middle" fill="#1565c0" fontSize="8" fontWeight="bold">Biblioteca</text>
        <text x="195" y="106" textAnchor="middle" fill="#1565c0" fontSize="7">Central</text>

        {/* Pabellón A */}
        <rect x="310" y="30" width="70" height="50" rx="5" fill="#ffe0b2" stroke="#ffb74d" strokeWidth="2" />
        <text x="345" y="60" textAnchor="middle" fill="#e65100" fontSize="8" fontWeight="bold">Pab. A</text>

        {/* Pabellón H */}
        <rect x="390" y="30" width="70" height="60" rx="5" fill="#e1bee7" stroke="#ce93d8" strokeWidth="2" />
        <text x="425" y="60" textAnchor="middle" fill="#6a1b9a" fontSize="8" fontWeight="bold">Pab. H</text>

        {/* Cafetería */}
        <rect x="170" y="175" width="65" height="45" rx="5" fill="#fff9c4" stroke="#fff176" strokeWidth="2" />
        <text x="202" y="200" textAnchor="middle" fill="#f57f17" fontSize="8" fontWeight="bold">Cafetería</text>

        {/* EEGGCC */}
        <rect x="310" y="175" width="80" height="55" rx="5" fill="#f8bbd0" stroke="#f48fb1" strokeWidth="2" />
        <text x="350" y="205" textAnchor="middle" fill="#880e4f" fontSize="8" fontWeight="bold">EEGGCC</text>

        {/* Canchas */}
        <rect x="20" y="175" width="70" height="55" rx="5" fill="#c8e6c9" stroke="#a5d6a7" strokeWidth="2" />
        <text x="55" y="205" textAnchor="middle" fill="#1b5e20" fontSize="8" fontWeight="bold">Canchas</text>

        {/* Estacionamiento */}
        <rect x="410" y="180" width="75" height="50" rx="5" fill="#cfd8dc" stroke="#b0bec5" strokeWidth="2" />
        <text x="447" y="208" textAnchor="middle" fill="#455a64" fontSize="8" fontWeight="bold">Estac.</text>

        {/* Patio Letras */}
        <rect x="20" y="60" width="70" height="55" rx="5" fill="#dcedc8" stroke="#aed581" strokeWidth="2" />
        <text x="55" y="90" textAnchor="middle" fill="#33691e" fontSize="8" fontWeight="bold">Patio</text>
        <text x="55" y="102" textAnchor="middle" fill="#33691e" fontSize="7">Letras</text>

        {/* Fac. Ingeniería */}
        <rect x="310" y="280" width="80" height="45" rx="5" fill="#b2ebf2" stroke="#80deea" strokeWidth="2" />
        <text x="350" y="305" textAnchor="middle" fill="#006064" fontSize="8" fontWeight="bold">Fac. Ing.</text>

        {/* Main entrance */}
        <rect x="284" y="315" width="32" height="20" rx="3" fill="#ffeb3b" stroke="#f9a825" strokeWidth="2" />
        <text x="300" y="329" textAnchor="middle" fill="#f57f17" fontSize="7" fontWeight="bold">INGRESO</text>

        {/* Incident markers */}
        {active.map(inc => (
          <g key={inc.id} transform={`translate(${inc.x * 6}, ${inc.y * 3.4})`}
            onMouseEnter={() => setHovered(inc.id)}
            onMouseLeave={() => setHovered(null)}
            className="cursor-pointer"
          >
            {/* Pulse effect for critical */}
            {inc.severity === 'critico' && (
              <circle r="16" fill={severityMapColor[inc.severity]} opacity="0.2">
                <animate attributeName="r" from="12" to="22" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.3" to="0" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
            <circle r="10" fill={severityMapColor[inc.severity]} stroke="white" strokeWidth="2" />
            <text y="4" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
              {inc.severity === 'critico' ? '!' : inc.severity === 'alto' ? '⚠' : '●'}
            </text>

            {/* Tooltip */}
            {hovered === inc.id && (
              <g transform="translate(12, -30)">
                <rect x="0" y="0" width="130" height="36" rx="4" fill="#1a1a2e" />
                <text x="6" y="13" fill="white" fontSize="7" fontWeight="bold">{inc.id}</text>
                <text x="6" y="24" fill="#aaa" fontSize="6.5">{inc.location.slice(0, 25)}...</text>
                <text x="6" y="33" fill={severityMapColor[inc.severity]} fontSize="6" fontWeight="bold">{inc.severity.toUpperCase()} · {statusLabel[inc.status]}</text>
              </g>
            )}
          </g>
        ))}

        {/* Legend */}
        <g transform="translate(10, 310)">
          <rect x="0" y="0" width="175" height="26" rx="4" fill="white" opacity="0.9" />
          {[
            { color: '#EF4444', label: 'Crítico' },
            { color: '#F97316', label: 'Alto' },
            { color: '#EAB308', label: 'Medio' },
            { color: '#22C55E', label: 'Bajo' },
          ].map((item, i) => (
            <g key={item.label} transform={`translate(${i * 44 + 5}, 4)`}>
              <circle cx="5" cy="9" r="5" fill={item.color} />
              <text x="13" y="13" fill="#555" fontSize="7">{item.label}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

export default function WebDashboard() {
  const [timeFilter, setTimeFilter] = useState('hoy');
  const now = new Date().toLocaleString('es-PE', { dateStyle: 'full', timeStyle: 'short' });

  const stats = [
    { label: 'Incidentes activos', value: mockIncidents.filter(i => ['nuevo', 'en_atencion', 'pendiente'].includes(i.status)).length, icon: AlertTriangle, color: 'text-red-500 bg-red-50', trend: '+2 esta hora' },
    { label: 'Críticos', value: mockIncidents.filter(i => i.severity === 'critico' && i.status !== 'cerrado').length, icon: AlertTriangle, color: 'text-red-600 bg-red-100', trend: 'Atención inmediata' },
    { label: 'En atención', value: mockIncidents.filter(i => i.status === 'en_atencion').length, icon: Clock, color: 'text-amber-500 bg-amber-50', trend: 'FRT: 4.2 min' },
    { label: 'Resueltos hoy', value: mockIncidents.filter(i => ['resuelto', 'cerrado'].includes(i.status)).length, icon: CheckCircle, color: 'text-green-500 bg-green-50', trend: '+3 vs ayer' },
    { label: 'Tiempo resp. prom.', value: '4.2 min', icon: TrendingUp, color: 'text-blue-500 bg-blue-50', trend: '↓ 12% vs semana' },
    { label: 'Operadores activos', value: '3/5', icon: CheckCircle, color: 'text-purple-500 bg-purple-50', trend: 'Turno mañana' },
  ];

  const activeIncidents = mockIncidents.filter(i => !['cerrado'].includes(i.status));

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard Operativo</h1>
          <p className="text-xs text-gray-400 mt-0.5">{now}</p>
        </div>
        <div className="flex items-center gap-2">
          {['hoy', 'semana', 'mes'].map(t => (
            <button
              key={t}
              onClick={() => setTimeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${timeFilter === t ? 'bg-[#001C55] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}
            >
              {t}
            </button>
          ))}
          <button className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {stats.map(({ label, value, icon: Icon, color, trend }) => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-gray-300" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-0.5">{value}</div>
            <div className="text-xs text-gray-500 mb-1">{label}</div>
            <div className="text-[10px] text-gray-400">{trend}</div>
          </div>
        ))}
      </div>

      {/* Map + Table */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Map */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#001C55]" />
              <h2 className="text-sm font-bold text-gray-800">Mapa Georreferenciado del Campus</h2>
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">
                <Filter className="w-3 h-3" /> Filtrar
              </button>
              <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded-lg flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                En vivo
              </span>
            </div>
          </div>
          <div className="p-4">
            <CampusMap incidents={mockIncidents} />
          </div>
        </div>

        {/* Active incidents feed */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-800">Incidentes Activos</h2>
            <span className="text-[10px] text-white bg-red-500 px-2 py-0.5 rounded-full font-bold">{activeIncidents.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {activeIncidents.map(inc => (
              <div key={inc.id} className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${severityColor[inc.severity]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-[10px] font-bold text-gray-400">{inc.id}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${statusBadge[inc.status]}`}>
                        {statusLabel[inc.status]}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-gray-800 line-clamp-1">{inc.title}</div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{inc.zone}</span>
                      <span className="ml-auto">{channelIcon[inc.channel]}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-gray-100">
            <button className="w-full text-xs text-[#001C55] font-semibold flex items-center justify-center gap-1 hover:underline">
              <Eye className="w-3.5 h-3.5" /> Ver todos los casos
            </button>
          </div>
        </div>
      </div>

      {/* Recent table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800">Registro reciente de incidentes</h2>
          <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#001C55] border border-gray-200 px-3 py-1.5 rounded-lg">
            <Filter className="w-3.5 h-3.5" /> Filtrar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['ID', 'Incidente', 'Tipo', 'Zona', 'Severidad', 'Estado', 'Canal', 'Asignado a', 'Registrado'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockIncidents.map((inc) => (
                <tr key={inc.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors cursor-pointer">
                  <td className="px-4 py-3 text-[11px] font-bold text-[#001C55] whitespace-nowrap">{inc.id}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs font-semibold text-gray-800 max-w-[180px] truncate">{inc.title}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 capitalize whitespace-nowrap">{inc.type.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{inc.zone}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${severityColor[inc.severity]}`} />
                      <span className="text-xs capitalize text-gray-700">{inc.severity}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge[inc.status]}`}>
                      {statusLabel[inc.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{channelIcon[inc.channel]}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{inc.assignedTo ? inc.assignedTo.split(' ')[0] : '—'}</td>
                  <td className="px-4 py-3 text-[11px] text-gray-400 whitespace-nowrap">{inc.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
