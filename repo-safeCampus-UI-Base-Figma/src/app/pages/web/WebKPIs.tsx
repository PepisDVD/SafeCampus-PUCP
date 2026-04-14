import { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Download, TrendingUp, TrendingDown, Clock, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';
import {
  kpiCards, incidentsByMonth, incidentsByType,
  incidentsByZone
} from '../../data/mockData';

export default function WebKPIs() {
  const [period, setPeriod] = useState('mes');
  const [reportFilter, setReportFilter] = useState({ from: '2026-02-01', to: '2026-03-23', severity: 'todos', zone: 'todas' });

  return (
    <div className="p-4 lg:p-6 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">KPIs y Reportes</h1>
          <p className="text-xs text-gray-400 mt-0.5">Indicadores operativos de seguridad del campus</p>
        </div>
        <div className="flex items-center gap-2">
          {['semana', 'mes', 'trimestre'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${period === p ? 'bg-[#001C55] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpiCards.map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className={`text-[10px] font-bold uppercase tracking-wider ${
                kpi.color === 'green' ? 'text-green-600' : kpi.color === 'red' ? 'text-red-600' : 'text-blue-600'
              }`}>{kpi.label}</div>
              {kpi.trend && (
                kpi.trend > 0 && kpi.color !== 'green' ? (
                  <TrendingUp className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-green-500" />
                )
              )}
            </div>
            <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
            {kpi.trend && (
              <div className={`text-[10px] mt-1 font-semibold ${
                (kpi.trend < 0 && kpi.color === 'green') || (kpi.trend > 0 && kpi.color === 'green')
                  ? 'text-green-600' : kpi.trend < 0 ? 'text-green-600' : 'text-red-500'
              }`}>
                {kpi.trend > 0 ? '+' : ''}{kpi.trend}% vs período anterior
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Line chart – Incidentes por mes */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800">Evolución de incidentes</h3>
            <div className="flex items-center gap-3 text-[10px]">
              <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-[#001C55]" /><span className="text-gray-500">Total</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-green-500" /><span className="text-gray-500">Resueltos</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-red-400" /><span className="text-gray-500">Críticos</span></div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={incidentsByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                labelStyle={{ fontWeight: 'bold', color: '#1f2937' }}
              />
              <Line type="monotone" dataKey="total" stroke="#001C55" strokeWidth={2.5} dot={{ r: 4, fill: '#001C55' }} name="Total" />
              <Line type="monotone" dataKey="resueltos" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: '#22c55e' }} name="Resueltos" />
              <Line type="monotone" dataKey="criticos" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} name="Críticos" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart – Por tipo */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Incidentes por tipo</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={incidentsByType}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
              >
                {incidentsByType.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {incidentsByType.map(item => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                <span className="text-xs text-gray-600 flex-1">{item.name}</span>
                <span className="text-xs font-bold text-gray-700">{item.value}</span>
                <span className="text-[10px] text-gray-400">{Math.round(item.value / 87 * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bar chart zones + SLA table */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Zones */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Incidentes por zona del campus</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={incidentsByZone} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis dataKey="zone" type="category" tick={{ fontSize: 10, fill: '#6b7280' }} width={110} />
              <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px' }} />
              <Bar dataKey="value" fill="#001C55" radius={[0, 6, 6, 0]} name="Incidentes">
                {incidentsByZone.map((_, index) => (
                  <Cell key={index} fill={index === 0 ? '#C8102E' : '#001C55'} opacity={1 - index * 0.12} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* SLA / Response Times */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Indicadores de respuesta (SLA)</h3>
          <div className="space-y-4">
            {[
              { label: 'FRT - Tiempo de Primera Respuesta', value: 4.2, target: 5, unit: 'min', icon: Clock, ok: true },
              { label: 'TMR - Tiempo Medio de Resolución', value: 38, target: 60, unit: 'min', icon: CheckCircle, ok: true },
              { label: 'Tasa de Escalamiento', value: 12, target: 15, unit: '%', icon: AlertTriangle, ok: true },
              { label: 'SLA de Críticos (< 2 min respuesta)', value: 85, target: 90, unit: '%', icon: AlertTriangle, ok: false },
            ].map(({ label, value, target, unit, icon: Icon, ok }) => {
              const pct = Math.min(100, Math.round((value / target) * 100));
              return (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${ok ? 'text-green-500' : 'text-amber-500'}`} />
                      <span className="text-xs text-gray-700">{label}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${ok ? 'text-green-600' : 'text-amber-500'}`}>{value}{unit}</span>
                      <span className="text-[10px] text-gray-400 ml-1">/ {target}{unit}</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${ok ? 'bg-green-400' : 'bg-amber-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Export Report */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-800">Exportar reporte</h3>
          <Calendar className="w-4 h-4 text-gray-400" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Desde</label>
            <input type="date" value={reportFilter.from} onChange={e => setReportFilter(f => ({ ...f, from: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#001C55]" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Hasta</label>
            <input type="date" value={reportFilter.to} onChange={e => setReportFilter(f => ({ ...f, to: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#001C55]" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Severidad</label>
            <select value={reportFilter.severity} onChange={e => setReportFilter(f => ({ ...f, severity: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#001C55] bg-white">
              <option value="todos">Todas</option>
              <option value="critico">Crítico</option>
              <option value="alto">Alto</option>
              <option value="medio">Medio</option>
              <option value="bajo">Bajo</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Zona</label>
            <select value={reportFilter.zone} onChange={e => setReportFilter(f => ({ ...f, zone: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#001C55] bg-white">
              <option value="todas">Todas</option>
              <option value="central">Zona Central</option>
              <option value="ciencias">Zona Ciencias</option>
              <option value="humanidades">Zona Humanidades</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-[#001C55] text-white px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-[#002580] transition-colors">
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </button>
          <button className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-red-700 transition-colors">
            <Download className="w-3.5 h-3.5" /> Exportar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
