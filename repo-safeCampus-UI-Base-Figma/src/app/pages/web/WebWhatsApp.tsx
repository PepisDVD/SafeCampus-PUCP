import { useState } from 'react';
import {
  Search, Phone, Send, Bot, User, Headphones,
  X, AlertTriangle, ArrowUpCircle, UserPlus,
  CheckCircle, Clock, MessageSquare, Filter,
  Star, StarOff, ExternalLink
} from 'lucide-react';
import { whatsappChats, mockUsers, type WhatsAppChat } from '../../data/mockData';

const statusConfig: Record<string, { label: string; color: string; icon: typeof Bot }> = {
  bot: { label: 'Bot', color: 'bg-blue-100 text-blue-700', icon: Bot },
  humano: { label: 'Agente', color: 'bg-green-100 text-green-700', icon: Headphones },
  esperando: { label: 'Esperando', color: 'bg-amber-100 text-amber-700', icon: Clock },
  cerrado: { label: 'Cerrado', color: 'bg-gray-100 text-gray-500', icon: CheckCircle },
};

const priorityConfig: Record<string, { label: string; color: string; dot: string }> = {
  alta: { label: 'Alta', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  media: { label: 'Media', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  baja: { label: 'Baja', color: 'bg-green-100 text-green-700', dot: 'bg-green-400' },
};

const operators = mockUsers.filter(u => u.role === 'operador' && u.status === 'activo');

export default function WebWhatsApp() {
  const [chats, setChats] = useState(whatsappChats);
  const [selectedId, setSelectedId] = useState<string | null>(whatsappChats[0]?.id ?? null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterPriority, setFilterPriority] = useState('todos');
  const [newMessage, setNewMessage] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);

  const filtered = chats.filter(c => {
    if (search && !c.contactName.toLowerCase().includes(search.toLowerCase()) && !c.phone.includes(search)) return false;
    if (filterStatus !== 'todos' && c.status !== filterStatus) return false;
    if (filterPriority !== 'todos' && c.priority !== filterPriority) return false;
    return true;
  });

  const selected = chats.find(c => c.id === selectedId) ?? null;

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selected) return;
    const updatedChats = chats.map(c => {
      if (c.id !== selected.id) return c;
      return {
        ...c,
        status: 'humano' as const,
        lastMessage: newMessage,
        lastMessageTime: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        messages: [
          ...c.messages,
          {
            id: `m${c.messages.length + 1}`,
            from: 'agent' as const,
            text: newMessage,
            time: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
          },
        ],
      };
    });
    setChats(updatedChats);
    setNewMessage('');
  };

  const handleTakeOver = () => {
    if (!selected) return;
    setChats(prev => prev.map(c =>
      c.id === selected.id ? { ...c, status: 'humano' as const, assignedTo: 'Luis Fernández Castro' } : c
    ));
  };

  const handleChangePriority = (chatId: string, priority: WhatsAppChat['priority']) => {
    setChats(prev => prev.map(c =>
      c.id === chatId ? { ...c, priority } : c
    ));
  };

  const handleAssign = (operatorName: string) => {
    if (!selected) return;
    setChats(prev => prev.map(c =>
      c.id === selected.id ? { ...c, assignedTo: operatorName, status: 'humano' as const } : c
    ));
    setShowAssignModal(false);
  };

  const handleCloseChat = () => {
    if (!selected) return;
    setChats(prev => prev.map(c =>
      c.id === selected.id ? { ...c, status: 'cerrado' as const, unread: 0 } : c
    ));
  };

  // Stats
  const totalActive = chats.filter(c => c.status !== 'cerrado').length;
  const waitingCount = chats.filter(c => c.status === 'esperando').length;
  const humanCount = chats.filter(c => c.status === 'humano').length;
  const botCount = chats.filter(c => c.status === 'bot').length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Centro de Mensajes WhatsApp</h1>
            <p className="text-xs text-gray-400">Gestión de conversaciones del bot SafeCampus</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 bg-gray-100 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Bot activo
            </span>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex gap-3 mt-3 flex-wrap">
          {[
            { label: 'Activas', value: totalActive, color: 'text-[#001C55] bg-blue-50' },
            { label: 'Esperando', value: waitingCount, color: 'text-amber-600 bg-amber-50' },
            { label: 'Agente', value: humanCount, color: 'text-green-600 bg-green-50' },
            { label: 'Bot', value: botCount, color: 'text-blue-600 bg-blue-50' },
          ].map(s => (
            <div key={s.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold ${s.color}`}>
              <span className="text-lg font-bold">{s.value}</span>
              {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat list panel */}
        <div className={`w-full md:w-[340px] lg:w-[380px] shrink-0 border-r border-gray-200 bg-white flex flex-col ${selected ? 'hidden md:flex' : 'flex'}`}>
          {/* Search + Filters */}
          <div className="p-3 border-b border-gray-100 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar contacto o número..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#001C55] bg-gray-50"
              />
            </div>
            <div className="flex gap-1.5">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-xl px-2 py-1.5 text-[11px] bg-white focus:outline-none focus:border-[#001C55] flex-1">
                <option value="todos">Todos los estados</option>
                <option value="esperando">Esperando</option>
                <option value="humano">Agente</option>
                <option value="bot">Bot</option>
                <option value="cerrado">Cerrado</option>
              </select>
              <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="border border-gray-200 rounded-xl px-2 py-1.5 text-[11px] bg-white focus:outline-none focus:border-[#001C55] flex-1">
                <option value="todos">Todas las prioridades</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="flex items-center justify-center h-32 text-xs text-gray-300">No hay conversaciones</div>
            )}
            {filtered.map(chat => {
              const stCfg = statusConfig[chat.status];
              const prCfg = priorityConfig[chat.priority];
              const isSelected = selectedId === chat.id;
              return (
                <div
                  key={chat.id}
                  onClick={() => setSelectedId(chat.id)}
                  className={`px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/60' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 bg-[#25D366] rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {chat.contactName === 'Número desconocido' ? '?' : chat.contactName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${prCfg.dot}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-bold text-gray-800 truncate">{chat.contactName}</span>
                        <span className="text-[10px] text-gray-400 shrink-0">{chat.lastMessageTime}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 truncate mb-1.5">{chat.lastMessage}</div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${stCfg.color}`}>{stCfg.label}</span>
                        {chat.incidentId && (
                          <span className="text-[9px] text-[#001C55] font-bold bg-blue-50 px-1.5 py-0.5 rounded-full">{chat.incidentId}</span>
                        )}
                        {chat.unread > 0 && (
                          <span className="ml-auto w-5 h-5 bg-[#25D366] text-white text-[10px] font-bold rounded-full flex items-center justify-center">{chat.unread}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat detail / messages */}
        {selected ? (
          <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
            {/* Chat header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
              <button onClick={() => setSelectedId(null)} className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-4 h-4" />
              </button>
              <div className="w-9 h-9 bg-[#25D366] rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
                {selected.contactName === 'Número desconocido' ? '?' : selected.contactName.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-gray-800 truncate">{selected.contactName}</div>
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                  <Phone className="w-3 h-3" />
                  <span>{selected.phone}</span>
                  {selected.assignedTo && (
                    <>
                      <span>·</span>
                      <User className="w-3 h-3" />
                      <span>{selected.assignedTo}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Priority selector */}
                <div className="relative group">
                  <button className={`text-[9px] font-bold px-2 py-1 rounded-full ${priorityConfig[selected.priority].color}`}>
                    {priorityConfig[selected.priority].label}
                  </button>
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-1 hidden group-hover:block z-10 min-w-[100px]">
                    {(['alta', 'media', 'baja'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => handleChangePriority(selected.id, p)}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 rounded-lg capitalize flex items-center gap-2"
                      >
                        <div className={`w-2 h-2 rounded-full ${priorityConfig[p].dot}`} />
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <span className={`text-[9px] font-bold px-2 py-1 rounded-full ${statusConfig[selected.status].color}`}>{statusConfig[selected.status].label}</span>
              </div>
            </div>

            {/* Action bar */}
            <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-2 shrink-0 flex-wrap">
              {selected.status !== 'humano' && selected.status !== 'cerrado' && (
                <button
                  onClick={handleTakeOver}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#001C55] text-white rounded-xl text-[11px] font-semibold hover:bg-[#002580] transition-colors"
                >
                  <Headphones className="w-3.5 h-3.5" /> Tomar control
                </button>
              )}
              <button
                onClick={() => setShowAssignModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" /> Asignar
              </button>
              {selected.incidentId && (
                <button className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-200 rounded-xl text-[11px] font-semibold text-[#001C55] hover:bg-blue-50 transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" /> {selected.incidentId}
                </button>
              )}
              {selected.status !== 'cerrado' && (
                <button
                  onClick={handleCloseChat}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-[11px] font-semibold text-gray-500 hover:bg-gray-50 transition-colors ml-auto"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Cerrar chat
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {selected.messages.map(msg => {
                const isUser = msg.from === 'user';
                const isBot = msg.from === 'bot';
                return (
                  <div key={msg.id} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isUser
                        ? 'bg-white border border-gray-200 rounded-tl-sm'
                        : isBot
                          ? 'bg-blue-100 text-blue-900 rounded-tr-sm'
                          : 'bg-[#001C55] text-white rounded-tr-sm'
                    }`}>
                      {!isUser && (
                        <div className={`text-[9px] font-bold mb-1 flex items-center gap-1 ${isBot ? 'text-blue-500' : 'text-blue-200'}`}>
                          {isBot ? <><Bot className="w-3 h-3" /> Bot SafeCampus</> : <><Headphones className="w-3 h-3" /> Agente</>}
                        </div>
                      )}
                      <div className="text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</div>
                      <div className={`text-[9px] mt-1 text-right ${isUser ? 'text-gray-400' : isBot ? 'text-blue-400' : 'text-blue-200'}`}>{msg.time}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input area */}
            {selected.status !== 'cerrado' ? (
              <div className="bg-white border-t border-gray-200 px-4 py-3 shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder={selected.status === 'humano' || selected.status === 'esperando' ? 'Escribe un mensaje como agente...' : 'Toma el control para escribir...'}
                    disabled={selected.status === 'bot'}
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#001C55] bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || selected.status === 'bot'}
                    className="p-2.5 bg-[#25D366] text-white rounded-xl hover:bg-[#1da851] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                {selected.status === 'bot' && (
                  <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
                    <Bot className="w-3 h-3" /> El bot está gestionando esta conversación. Presiona "Tomar control" para intervenir.
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-gray-100 border-t border-gray-200 px-4 py-3 text-center">
                <p className="text-xs text-gray-400">Esta conversación fue cerrada</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Selecciona una conversación</p>
              <p className="text-xs text-gray-300 mt-1">para ver los mensajes y gestionar el chat</p>
            </div>
          </div>
        )}

        {/* Info panel (desktop) */}
        {selected && (
          <div className="hidden xl:flex w-[280px] shrink-0 border-l border-gray-200 bg-white flex-col overflow-y-auto">
            <div className="p-4 border-b border-gray-100 text-center">
              <div className="w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-2">
                {selected.contactName === 'Número desconocido' ? '?' : selected.contactName.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
              <div className="text-sm font-bold text-gray-800">{selected.contactName}</div>
              <div className="text-[11px] text-gray-400">{selected.phone}</div>
            </div>

            <div className="p-4 space-y-4">
              {/* Info details */}
              <div className="bg-gray-50 rounded-2xl p-3 space-y-2.5">
                {[
                  { label: 'Estado', value: statusConfig[selected.status].label },
                  { label: 'Prioridad', value: priorityConfig[selected.priority].label },
                  { label: 'Asignado a', value: selected.assignedTo || 'Sin asignar' },
                  { label: 'Incidente', value: selected.incidentId || '—' },
                  { label: 'Mensajes', value: `${selected.messages.length}` },
                  { label: 'Último msg', value: selected.lastMessageTime },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-2">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase">{label}</span>
                    <span className="text-[11px] text-gray-700 font-medium text-right">{value}</span>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <div>
                <div className="text-[10px] text-gray-400 font-semibold uppercase mb-2">Acciones rápidas</div>
                <div className="space-y-1.5">
                  {selected.status !== 'cerrado' && selected.status !== 'humano' && (
                    <button
                      onClick={handleTakeOver}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-[#001C55] text-white rounded-xl text-xs font-semibold hover:bg-[#002580] transition-colors"
                    >
                      <Headphones className="w-3.5 h-3.5" /> Tomar control humano
                    </button>
                  )}
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Reasignar personal
                  </button>
                  {selected.priority !== 'alta' && selected.status !== 'cerrado' && (
                    <button
                      onClick={() => handleChangePriority(selected.id, 'alta')}
                      className="w-full flex items-center gap-2 px-3 py-2 border border-red-200 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <ArrowUpCircle className="w-3.5 h-3.5" /> Marcar prioridad alta
                    </button>
                  )}
                  {selected.status !== 'cerrado' && (
                    <button
                      onClick={handleCloseChat}
                      className="w-full flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Cerrar conversación
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Assign modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Asignar operador</h3>
              <button onClick={() => setShowAssignModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {operators.map(op => (
                <button
                  key={op.id}
                  onClick={() => handleAssign(op.name)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100"
                >
                  <div className="w-8 h-8 bg-[#001C55] rounded-xl flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    {op.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-gray-800">{op.name}</div>
                    <div className="text-[10px] text-gray-400">{op.code}</div>
                  </div>
                  {selected?.assignedTo === op.name && (
                    <span className="ml-auto text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Actual</span>
                  )}
                </button>
              ))}
            </div>
            <button onClick={() => setShowAssignModal(false)} className="w-full mt-3 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-xs font-semibold hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
