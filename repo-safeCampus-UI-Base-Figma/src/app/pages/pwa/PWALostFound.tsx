import { useState } from 'react';
import { Search, Package, MapPin, Calendar, Plus, X, Filter } from 'lucide-react';
import { mockLostFound } from '../../data/mockData';

const categories = ['Todos', 'Electrónico', 'Documentos', 'Mochila/Bolso', 'Ropa/Accesorios', 'Llaves', 'Otro'];

export default function PWALostFound() {
  const [filter, setFilter] = useState<'todos' | 'perdido' | 'encontrado'>('todos');
  const [category, setCategory] = useState('Todos');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'perdido' | 'encontrado'>('perdido');

  const filtered = mockLostFound.filter(item => {
    if (filter !== 'todos' && item.type !== filter) return false;
    if (category !== 'Todos' && item.category !== category) return false;
    if (search && !item.description.toLowerCase().includes(search.toLowerCase()) && !item.location.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (showForm) {
    return (
      <div>
        <div className="px-4 pt-4 pb-3 flex items-center gap-3">
          <button onClick={() => setShowForm(false)} className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
            <X className="w-4 h-4 text-gray-600" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Registrar objeto {formType}</h2>
          </div>
        </div>

        <div className="px-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {(['perdido', 'encontrado'] as const).map(t => (
              <button
                key={t}
                onClick={() => setFormType(t)}
                className={`py-3 rounded-2xl border-2 font-semibold text-sm capitalize transition-all ${formType === t ? (t === 'perdido' ? 'border-red-400 bg-red-50 text-red-700' : 'border-green-400 bg-green-50 text-green-700') : 'border-gray-200 text-gray-500'}`}
              >
                {t === 'perdido' ? '😔 Perdido' : '🎉 Encontrado'}
              </button>
            ))}
          </div>

          {[
            { label: 'Categoría del objeto', type: 'select' },
            { label: 'Descripción del objeto', type: 'textarea' },
            { label: 'Lugar donde se perdió/encontró', type: 'input' },
            { label: 'Fecha aproximada', type: 'date' },
          ].map(field => (
            <div key={field.label}>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">{field.label}</label>
              {field.type === 'select' ? (
                <select className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:border-[#001C55]">
                  {categories.filter(c => c !== 'Todos').map(c => <option key={c}>{c}</option>)}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea rows={3} placeholder="Describe el objeto con el mayor detalle posible..." className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:border-[#001C55] resize-none" />
              ) : field.type === 'date' ? (
                <input type="date" className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:border-[#001C55]" />
              ) : (
                <input type="text" placeholder="Ej: Biblioteca Central, Pabellón H..." className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:border-[#001C55]" />
              )}
            </div>
          ))}

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Foto del objeto (recomendado)</label>
            <button className="w-full border-2 border-dashed border-gray-300 rounded-2xl py-5 flex flex-col items-center gap-2 text-gray-400">
              <Package className="w-6 h-6" />
              <span className="text-xs">Adjuntar fotografía</span>
            </button>
          </div>

          <button
            onClick={() => setShowForm(false)}
            className={`w-full py-3.5 rounded-2xl font-semibold text-sm text-white shadow-md ${formType === 'perdido' ? 'bg-red-500' : 'bg-green-600'}`}
          >
            Registrar objeto {formType}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Lost & Found</h2>
            <p className="text-xs text-gray-500">Objetos perdidos y encontrados en el campus</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="w-10 h-10 bg-[#001C55] rounded-2xl flex items-center justify-center shadow-md"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            type="text"
            placeholder="Buscar objeto..."
            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-2xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#001C55]/20 border border-transparent focus:border-[#001C55]/30 transition-all"
          />
        </div>

        {/* Type filter */}
        <div className="flex gap-2 mb-3">
          {[
            { id: 'todos', label: 'Todos', count: mockLostFound.length },
            { id: 'perdido', label: '😔 Perdidos', count: mockLostFound.filter(i => i.type === 'perdido').length },
            { id: 'encontrado', label: '🎉 Encontrados', count: mockLostFound.filter(i => i.type === 'encontrado').length },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as typeof filter)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${filter === f.id ? 'bg-[#001C55] text-white border-[#001C55]' : 'bg-white text-gray-600 border-gray-200'}`}
            >
              {f.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${filter === f.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{f.count}</span>
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap border transition-all shrink-0 ${category === c ? 'bg-blue-50 text-[#001C55] border-blue-200' : 'bg-white text-gray-500 border-gray-200'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="px-4 mt-3 space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Filter className="w-10 h-10 text-gray-200 mb-3" />
            <div className="text-sm font-semibold text-gray-500">Sin resultados</div>
            <div className="text-xs text-gray-400">Intenta con otros filtros</div>
          </div>
        ) : (
          filtered.map(item => (
            <div key={item.id} className={`bg-white rounded-2xl border-2 p-4 shadow-sm ${item.status === 'cerrado' ? 'opacity-60' : ''} ${item.type === 'perdido' ? 'border-l-4 border-l-red-400 border-t-gray-100 border-r-gray-100 border-b-gray-100' : 'border-l-4 border-l-green-400 border-t-gray-100 border-r-gray-100 border-b-gray-100'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.type === 'perdido' ? 'bg-red-50' : 'bg-green-50'}`}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />
                  ) : (
                    <Package className={`w-5 h-5 ${item.type === 'perdido' ? 'text-red-400' : 'text-green-500'}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.type === 'perdido' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                      {item.type === 'perdido' ? '😔 PERDIDO' : '🎉 ENCONTRADO'}
                    </span>
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{item.category}</span>
                    {item.status === 'cerrado' && <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Cerrado</span>}
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed line-clamp-2 mb-2">{item.description}</p>
                  <div className="flex flex-wrap gap-2 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{item.location}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{item.date}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="h-4" />
    </div>
  );
}
