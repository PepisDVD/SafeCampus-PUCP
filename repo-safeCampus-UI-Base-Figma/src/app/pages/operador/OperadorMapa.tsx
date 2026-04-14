import { useState } from 'react';
import { MapPin, Filter, ChevronRight, Layers } from 'lucide-react';
import { mockIncidents } from '../../data/mockData';

const severityMapColor: Record<string, string> = {
  critico: '#EF4444',
  alto: '#F97316',
  medio: '#EAB308',
  bajo: '#22C55E',
};

const layerOptions = ['Todos', 'Crítico', 'Alto', 'Medio', 'Bajo'];

export default function OperadorMapa() {
  const [selectedLayer, setSelectedLayer] = useState('Todos');
  const [selected, setSelected] = useState<string | null>(null);

  const filteredIncidents = mockIncidents.filter(inc => {
    if (selectedLayer === 'Todos') return !['cerrado'].includes(inc.status);
    return inc.severity === selectedLayer.toLowerCase() && !['cerrado'].includes(inc.status);
  });

  const selectedIncident = mockIncidents.find(i => i.id === selected);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3">
        <h2 className="text-lg font-bold text-white">Mapa del Campus</h2>
        <p className="text-gray-500 text-xs mt-0.5">{filteredIncidents.length} incidentes activos en mapa</p>
      </div>

      {/* Layer filter */}
      <div className="px-4 mb-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {layerOptions.map(opt => (
            <button
              key={opt}
              onClick={() => setSelectedLayer(opt)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all shrink-0 ${selectedLayer === opt ? 'bg-orange-500 text-white border-orange-500' : 'bg-[#161b22] text-gray-500 border-gray-800'}`}
            >
              {opt}
            </button>
          ))}
          <button className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#161b22] text-gray-500 border border-gray-800 flex items-center gap-1 whitespace-nowrap shrink-0">
            <Layers className="w-3 h-3" /> Capas
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="mx-4 rounded-2xl overflow-hidden border border-gray-700 mb-4" style={{ height: '320px' }}>
        <svg viewBox="0 0 400 320" className="w-full h-full" onClick={() => setSelected(null)}>
          {/* Dark map background */}
          <rect width="400" height="320" fill="#1a2332" />

          {/* Grid */}
          <defs>
            <pattern id="darkgrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e2d40" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="400" height="320" fill="url(#darkgrid)" />

          {/* Green spaces */}
          <ellipse cx="200" cy="160" rx="60" ry="40" fill="#1a3a1a" opacity="0.8" />
          <ellipse cx="60" cy="280" rx="50" ry="25" fill="#1a3a1a" opacity="0.6" />
          <ellipse cx="340" cy="270" rx="55" ry="30" fill="#1a3a1a" opacity="0.6" />

          {/* Roads */}
          <rect x="185" y="0" width="15" height="320" fill="#253347" />
          <rect x="0" y="140" width="400" height="14" fill="#253347" />
          <rect x="0" y="245" width="400" height="10" fill="#1e2d40" />
          <rect x="55" y="0" width="10" height="320" fill="#1e2d40" opacity="0.8" />
          <rect x="325" y="0" width="10" height="320" fill="#1e2d40" opacity="0.8" />

          {/* Buildings */}
          <rect x="80" y="25" width="75" height="55" rx="4" fill="#1e3a5f" stroke="#2a5280" strokeWidth="1.5" />
          <text x="117" y="55" textAnchor="middle" fill="#5b9bd5" fontSize="7" fontWeight="bold">Biblioteca</text>
          <text x="117" y="66" textAnchor="middle" fill="#5b9bd5" fontSize="6">Central</text>

          <rect x="205" y="20" width="55" height="45" rx="4" fill="#3d2b00" stroke="#6b4a0a" strokeWidth="1.5" />
          <text x="232" y="47" textAnchor="middle" fill="#d4a44c" fontSize="7" fontWeight="bold">Pab. A</text>

          <rect x="270" y="15" width="55" height="55" rx="4" fill="#3b1f4e" stroke="#6b3a9a" strokeWidth="1.5" />
          <text x="297" y="47" textAnchor="middle" fill="#a87dd4" fontSize="7" fontWeight="bold">Pab. H</text>

          <rect x="100" y="165" width="60" height="40" rx="4" fill="#3d3000" stroke="#6b5500" strokeWidth="1.5" />
          <text x="130" y="190" textAnchor="middle" fill="#d4b44c" fontSize="7" fontWeight="bold">Cafetería</text>

          <rect x="205" y="163" width="65" height="48" rx="4" fill="#3a0f1a" stroke="#7a1f3a" strokeWidth="1.5" />
          <text x="237" y="191" textAnchor="middle" fill="#d4607a" fontSize="7" fontWeight="bold">EEGGCC</text>

          <rect x="10" y="160" width="55" height="48" rx="4" fill="#0f2b0f" stroke="#1a6b1a" strokeWidth="1.5" />
          <text x="37" y="186" textAnchor="middle" fill="#5db85d" fontSize="7" fontWeight="bold">Canchas</text>

          <rect x="280" y="168" width="55" height="45" rx="4" fill="#1a2535" stroke="#2d4a6b" strokeWidth="1.5" />
          <text x="307" y="195" textAnchor="middle" fill="#6b9bd4" fontSize="7" fontWeight="bold">Estac.</text>

          <rect x="10" y="35" width="55" height="50" rx="4" fill="#0f2b0f" stroke="#2a6b2a" strokeWidth="1.5" />
          <text x="37" y="62" textAnchor="middle" fill="#5db85d" fontSize="7" fontWeight="bold">Patio</text>
          <text x="37" y="73" textAnchor="middle" fill="#5db85d" fontSize="6">Letras</text>

          <rect x="205" y="265" width="65" height="40" rx="4" fill="#0f2535" stroke="#1a4a6b" strokeWidth="1.5" />
          <text x="237" y="290" textAnchor="middle" fill="#4a9bd4" fontSize="7" fontWeight="bold">Fac. Ing.</text>

          {/* My location */}
          <circle cx="192" cy="155" r="8" fill="#3b82f6" opacity="0.3" />
          <circle cx="192" cy="155" r="5" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
          <circle cx="192" cy="155" r="12" fill="#3b82f6" opacity="0.1">
            <animate attributeName="r" from="8" to="18" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.15" to="0" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Incident markers */}
          {filteredIncidents.map(inc => {
            const x = inc.x * 4;
            const y = inc.y * 3.2;
            const color = severityMapColor[inc.severity];
            const isSelected = selected === inc.id;
            return (
              <g key={inc.id} transform={`translate(${x}, ${y})`}
                onClick={(e) => { e.stopPropagation(); setSelected(isSelected ? null : inc.id); }}
                className="cursor-pointer"
              >
                {inc.severity === 'critico' && (
                  <circle r="14" fill={color} opacity="0.15">
                    <animate attributeName="r" from="10" to="20" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.2" to="0" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle r={isSelected ? 12 : 10} fill={color} stroke="white" strokeWidth={isSelected ? 2.5 : 1.5} opacity={0.9} />
                <text y="4" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
                  {inc.severity === 'critico' ? '!' : '●'}
                </text>
              </g>
            );
          })}

          {/* Legend */}
          <rect x="5" y="295" width="175" height="22" rx="4" fill="#161b22" opacity="0.9" />
          {[
            { color: '#EF4444', label: 'Crítico' },
            { color: '#F97316', label: 'Alto' },
            { color: '#EAB308', label: 'Medio' },
            { color: '#22C55E', label: 'Bajo' },
          ].map((item, i) => (
            <g key={item.label} transform={`translate(${i * 44 + 10}, 298)`}>
              <circle cx="5" cy="8" r="4" fill={item.color} />
              <text x="12" y="12" fill="#6b7280" fontSize="6">{item.label}</text>
            </g>
          ))}

          {/* My location label */}
          <rect x="175" y="128" width="40" height="12" rx="3" fill="#1e3a5f" opacity="0.9" />
          <text x="195" y="138" textAnchor="middle" fill="#60a5fa" fontSize="6">Mi posición</text>
        </svg>
      </div>

      {/* Selected incident detail */}
      {selectedIncident && (
        <div className="mx-4 bg-[#161b22] border border-gray-700 rounded-2xl p-4 mb-3">
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 rounded-full mt-1 shrink-0 animate-pulse"
              style={{ background: severityMapColor[selectedIncident.severity] }} />
            <div className="flex-1 min-w-0">
              <div className="text-gray-500 text-[10px] font-mono">{selectedIncident.id}</div>
              <div className="text-white text-sm font-bold">{selectedIncident.title}</div>
              <div className="text-gray-400 text-xs mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />{selectedIncident.location}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-orange-400 shrink-0" />
          </div>
        </div>
      )}

      {/* Nearby incidents list */}
      <div className="px-4">
        <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">Incidentes en tu zona</div>
        <div className="space-y-2 pb-4">
          {filteredIncidents.slice(0, 4).map(inc => (
            <button
              key={inc.id}
              onClick={() => setSelected(inc.id === selected ? null : inc.id)}
              className={`w-full flex items-center gap-3 p-3 bg-[#161b22] rounded-2xl border transition-all text-left ${selected === inc.id ? 'border-orange-500/50' : 'border-gray-800 hover:border-gray-700'}`}
            >
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: severityMapColor[inc.severity] }} />
              <div className="flex-1 min-w-0">
                <div className="text-white text-xs font-semibold line-clamp-1">{inc.title}</div>
                <div className="text-gray-600 text-[10px] flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />{inc.zone}
                </div>
              </div>
              <span className="text-[10px] text-gray-500 capitalize shrink-0">{inc.severity}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
