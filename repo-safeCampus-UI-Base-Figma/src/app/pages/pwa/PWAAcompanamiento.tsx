import { useState, useEffect } from 'react';
import { Navigation, MapPin, ShieldCheck, AlertTriangle, CheckCircle, Clock, ChevronDown } from 'lucide-react';

type AState = 'idle' | 'configuring' | 'active' | 'alerta';

const destinations = [
  'Estacionamiento Principal',
  'Puerta 2 - Av. Universitaria',
  'Puerta 3 - Camino Real',
  'Paradero Universitaria',
  'Paradero Riva Agüero',
  'Biblioteca Central',
  'Pabellón H',
  'Canchas Deportivas',
  'Otro destino',
];

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function PWAAcompanamiento() {
  const [state, setState] = useState<AState>('idle');
  const [dest, setDest] = useState('');
  const [duration, setDuration] = useState(15);
  const [elapsed, setElapsed] = useState(0);
  const total = duration * 60;

  useEffect(() => {
    if (state !== 'active') return;
    const interval = setInterval(() => {
      setElapsed(e => {
        if (e + 1 >= total) {
          setState('alerta');
          clearInterval(interval);
          return e + 1;
        }
        return e + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state, total]);

  const progress = Math.min(elapsed / total, 1);
  const remaining = Math.max(total - elapsed, 0);

  const circumference = 2 * Math.PI * 60;
  const strokeDashoffset = circumference * (1 - progress);

  if (state === 'alerta') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <div className="relative mb-6">
          <div className="w-28 h-28 bg-red-100 rounded-full flex items-center justify-center animate-pulse">
            <AlertTriangle className="w-14 h-14 text-red-500" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full animate-ping" />
        </div>
        <h2 className="text-xl font-bold text-red-600 mb-2">¡ALERTA ACTIVADA!</h2>
        <p className="text-sm text-gray-600 mb-1">El tiempo del trayecto ha expirado.</p>
        <p className="text-xs text-gray-500 mb-6">El equipo de seguridad ha sido notificado automáticamente.</p>

        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 w-full mb-6 text-left">
          <div className="text-xs font-bold text-red-600 mb-2">Información enviada a seguridad:</div>
          <div className="space-y-1 text-xs text-red-700">
            <div>• Última ubicación registrada</div>
            <div>• Destino: <strong>{dest}</strong></div>
            <div>• Duración configurada: <strong>{duration} min</strong></div>
            <div>• Usuario: <strong>María García López</strong></div>
          </div>
        </div>

        <div className="w-full space-y-3">
          <button
            onClick={() => { setState('idle'); setElapsed(0); setDest(''); }}
            className="w-full bg-green-600 text-white py-3.5 rounded-2xl font-semibold text-sm"
          >
            ✓ Llegué segura — Cancelar alerta
          </button>
          <button className="w-full border-2 border-red-300 text-red-600 py-3.5 rounded-2xl font-semibold text-sm">
            Solicitar ayuda urgente
          </button>
        </div>
      </div>
    );
  }

  if (state === 'active') {
    return (
      <div>
        <div className="px-4 pt-4 pb-3">
          <h2 className="text-lg font-bold text-gray-900">Acompañamiento Activo</h2>
          <p className="text-xs text-green-600 font-semibold flex items-center gap-1 mt-0.5">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Seguridad está monitoreando tu trayecto
          </p>
        </div>

        {/* Timer circle */}
        <div className="flex flex-col items-center py-6">
          <div className="relative">
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="60" fill="none" stroke="#e5e7eb" strokeWidth="10" />
              <circle
                cx="80" cy="80" r="60"
                fill="none"
                stroke={progress > 0.75 ? '#EF4444' : progress > 0.5 ? '#F59E0B' : '#001C55'}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 80 80)"
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-gray-900">{formatTime(remaining)}</div>
              <div className="text-[10px] text-gray-400">restante</div>
            </div>
          </div>

          <div className="text-sm font-semibold text-gray-700 mt-3">→ {dest}</div>
          <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(elapsed)} transcurrido
          </div>
        </div>

        {/* Location */}
        <div className="mx-4 bg-green-50 border border-green-200 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-green-700">Ubicación compartida en tiempo real</span>
          </div>
          <div className="relative h-24 bg-white rounded-xl overflow-hidden border border-green-100">
            <svg viewBox="0 0 300 100" className="w-full h-full">
              <rect width="300" height="100" fill="#f0fdf4" />
              <rect x="5" y="5" width="290" height="90" rx="8" fill="#dcfce7" stroke="#bbf7d0" strokeWidth="1" />
              <rect x="15" y="15" width="60" height="30" rx="3" fill="#bbf7d0" stroke="#86efac" strokeWidth="1" />
              <rect x="85" y="15" width="50" height="25" rx="3" fill="#fef9c3" stroke="#fde047" strokeWidth="1" />
              <rect x="145" y="10" width="70" height="35" rx="3" fill="#fce7f3" stroke="#fbcfe8" strokeWidth="1" />
              <rect x="225" y="15" width="60" height="30" rx="3" fill="#ede9fe" stroke="#ddd6fe" strokeWidth="1" />
              <rect x="20" y="60" width="80" height="25" rx="3" fill="#dbeafe" stroke="#bfdbfe" strokeWidth="1" />
              <line x1="0" y1="50" x2="300" y2="50" stroke="#d1fae5" strokeWidth="3" />
              <line x1="150" y1="0" x2="150" y2="100" stroke="#d1fae5" strokeWidth="2" />
              {/* Moving dot */}
              <circle cx={30 + progress * 180} cy="50" r="6" fill="#001C55" />
              <circle cx={30 + progress * 180} cy="50" r="10" fill="#001C55" opacity="0.2" />
            </svg>
          </div>
        </div>

        {/* SOS */}
        <div className="px-4 space-y-3">
          <button className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-200">
            <AlertTriangle className="w-5 h-5" />
            BOTÓN DE EMERGENCIA SOS
          </button>
          <button
            onClick={() => { setState('idle'); setElapsed(0); setDest(''); }}
            className="w-full border-2 border-green-400 text-green-700 bg-green-50 py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Llegué segura — Finalizar trayecto
          </button>
        </div>
      </div>
    );
  }

  if (state === 'configuring') {
    return (
      <div>
        <div className="px-4 pt-4 pb-3">
          <button onClick={() => setState('idle')} className="text-xs text-gray-500 mb-2">← Volver</button>
          <h2 className="text-lg font-bold text-gray-900">Configurar trayecto</h2>
          <p className="text-xs text-gray-500 mt-0.5">Seguridad monitoreará tu recorrido</p>
        </div>

        <div className="px-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">¿A dónde vas? *</label>
            <div className="relative">
              <select
                value={dest}
                onChange={e => setDest(e.target.value)}
                className="w-full appearance-none border border-gray-200 rounded-2xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:border-[#001C55] pr-10"
              >
                <option value="">Selecciona tu destino...</option>
                {destinations.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Duración estimada del trayecto</label>
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 15, 20, 30, 45, 60].map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`py-3 rounded-xl text-xs font-bold border-2 transition-all ${duration === d ? 'border-[#001C55] bg-[#001C55] text-white' : 'border-gray-200 text-gray-600'}`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <div className="text-xs font-bold text-[#001C55] mb-2">¿Cómo funciona?</div>
            <ul className="text-xs text-blue-700 space-y-1.5">
              <li className="flex items-start gap-2"><span>🛡️</span><span>Seguridad monitorea tu trayecto durante el tiempo configurado.</span></li>
              <li className="flex items-start gap-2"><span>⏰</span><span>Si no confirmas llegada al finalizar, se activa una alerta automática.</span></li>
              <li className="flex items-start gap-2"><span>🆘</span><span>Puedes activar el SOS en cualquier momento durante el trayecto.</span></li>
            </ul>
          </div>

          <button
            onClick={() => dest && setState('active')}
            disabled={!dest}
            className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all ${dest ? 'bg-[#001C55] text-white shadow-lg shadow-blue-200' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            <Navigation className="w-5 h-5" />
            Iniciar acompañamiento seguro
          </button>
        </div>
      </div>
    );
  }

  // Idle state
  return (
    <div>
      <div className="px-4 pt-4 pb-3">
        <h2 className="text-lg font-bold text-gray-900">Acompañamiento Seguro</h2>
        <p className="text-xs text-gray-500 mt-0.5">Seguridad monitorea tu trayecto en el campus</p>
      </div>

      <div className="px-4">
        {/* Hero */}
        <div className="bg-gradient-to-br from-[#001C55] to-[#003087] rounded-3xl p-6 text-white text-center mb-5">
          <div className="w-20 h-20 bg-white/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h3 className="font-bold text-base mb-2">Camina segura en el campus</h3>
          <p className="text-blue-200 text-xs leading-relaxed">
            Activa el acompañamiento seguro para que el equipo de seguridad PUCP monitoree tu trayecto.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-5">
          {[
            { icon: '📍', title: 'Seguimiento en tiempo real', desc: 'Tu ubicación se comparte con seguridad durante el trayecto.' },
            { icon: '⏱️', title: 'Temporizador automático', desc: 'Al expirar el tiempo sin confirmación, se activa una alerta.' },
            { icon: '🆘', title: 'Botón SOS', desc: 'Activa una alerta inmediata en cualquier momento.' },
          ].map(f => (
            <div key={f.title} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex gap-3 items-start">
              <span className="text-xl">{f.icon}</span>
              <div>
                <div className="text-sm font-semibold text-gray-800">{f.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setState('configuring')}
          className="w-full bg-[#001C55] text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
        >
          <Navigation className="w-5 h-5" />
          Iniciar acompañamiento
        </button>

        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2">
          <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            <strong>Requiere permisos de ubicación.</strong> Tu posición solo se comparte con el equipo de seguridad mientras el acompañamiento está activo.
          </p>
        </div>
      </div>
    </div>
  );
}
