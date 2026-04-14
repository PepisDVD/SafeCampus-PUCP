import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  MapPin, Camera, ChevronDown, CheckCircle, AlertTriangle,
  Flame, HeartPulse, ShieldAlert, Wrench, HelpCircle, Eye
} from 'lucide-react';

const incidentTypes = [
  { id: 'robo', label: 'Robo / Hurto', icon: ShieldAlert, color: 'text-red-500 bg-red-50' },
  { id: 'emergencia_medica', label: 'Emergencia Médica', icon: HeartPulse, color: 'text-pink-500 bg-pink-50' },
  { id: 'incendio', label: 'Incendio / Humo', icon: Flame, color: 'text-orange-500 bg-orange-50' },
  { id: 'accidente', label: 'Accidente', icon: AlertTriangle, color: 'text-amber-500 bg-amber-50' },
  { id: 'sospechoso', label: 'Persona Sospechosa', icon: Eye, color: 'text-blue-500 bg-blue-50' },
  { id: 'vandalismo', label: 'Vandalismo', icon: Wrench, color: 'text-purple-500 bg-purple-50' },
  { id: 'otro', label: 'Otro', icon: HelpCircle, color: 'text-gray-500 bg-gray-50' },
];

const zones = [
  'Biblioteca Central', 'Pabellón A', 'Pabellón H', 'Cafetería Central',
  'Estacionamiento Principal', 'Patio de Letras', 'Canchas Deportivas',
  'Facultad de Ingeniería', 'Facultad de Derecho', 'EEGGCC', 'EEGGLL',
  'Capilla del Campus', 'Otro',
];

type Step = 'tipo' | 'detalle' | 'ubicacion' | 'exito';

export default function PWAReportar() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('tipo');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [severity, setSeverity] = useState('');
  const [loading, setLoading] = useState(false);
  const [incidentId] = useState(`INC-2026-${Math.floor(Math.random() * 100) + 343}`);

  const stepIdx = ['tipo', 'detalle', 'ubicacion'].indexOf(step);

  const handleSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('exito');
    }, 1200);
  };

  if (step === 'exito') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">¡Reporte enviado!</h2>
        <p className="text-sm text-gray-500 mb-1">Tu incidente fue registrado exitosamente.</p>
        <div className="mt-3 bg-gray-50 rounded-2xl px-6 py-3 border border-gray-200">
          <div className="text-xs text-gray-400">Número de seguimiento</div>
          <div className="text-lg font-bold text-[#001C55]">{incidentId}</div>
        </div>
        <p className="text-xs text-gray-400 mt-3 leading-relaxed max-w-[260px]">
          Recibirás notificaciones sobre el estado de tu reporte. Promedio de atención: <strong>4.2 minutos</strong>.
        </p>
        <div className="mt-6 space-y-3 w-full">
          <button
            onClick={() => navigate('/pwa/mis-casos')}
            className="w-full bg-[#001C55] text-white py-3 rounded-2xl font-semibold text-sm"
          >
            Ver mis reportes
          </button>
          <button
            onClick={() => { setStep('tipo'); setType(''); setDescription(''); setLocation(''); setSeverity(''); }}
            className="w-full border border-gray-200 text-gray-600 py-3 rounded-2xl font-semibold text-sm"
          >
            Nuevo reporte
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <h2 className="text-lg font-bold text-gray-900">Reportar Incidente</h2>
        <p className="text-xs text-gray-500 mt-0.5">Tu reporte ayuda a mantener el campus seguro</p>
      </div>

      {/* Progress */}
      <div className="px-4 mb-4">
        <div className="flex gap-2">
          {['Tipo', 'Detalle', 'Ubicación'].map((label, i) => (
            <div key={label} className="flex-1 flex flex-col gap-1">
              <div className={`h-1.5 rounded-full transition-colors ${i <= stepIdx ? 'bg-[#001C55]' : 'bg-gray-200'}`} />
              <span className={`text-[10px] font-medium ${i === stepIdx ? 'text-[#001C55]' : 'text-gray-400'}`}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* STEP 1: Type */}
        {step === 'tipo' && (
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3">¿Qué tipo de incidente deseas reportar?</h3>
            <div className="grid grid-cols-2 gap-3">
              {incidentTypes.map(({ id, label, icon: Icon, color }) => (
                <button
                  key={id}
                  onClick={() => setType(id)}
                  className={`flex flex-col items-start gap-2 p-4 rounded-2xl border-2 text-left transition-all ${
                    type === id ? 'border-[#001C55] bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-gray-800 leading-tight">{label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => type && setStep('detalle')}
              disabled={!type}
              className={`w-full mt-4 py-3.5 rounded-2xl font-semibold text-sm transition-all ${type ? 'bg-[#001C55] text-white shadow-md' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
              Continuar
            </button>
          </div>
        )}

        {/* STEP 2: Detail */}
        {step === 'detalle' && (
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3">Describe lo que ocurrió</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Descripción *</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe con detalle lo que ocurrió: qué viste, cuándo, cómo..."
                  rows={4}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#001C55] bg-gray-50 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Severidad percibida</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'bajo', label: 'Baja', color: 'border-green-400 bg-green-50 text-green-700' },
                    { id: 'medio', label: 'Media', color: 'border-amber-400 bg-amber-50 text-amber-700' },
                    { id: 'alto', label: 'Alta', color: 'border-red-400 bg-red-50 text-red-700' },
                  ].map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSeverity(s.id)}
                      className={`py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${severity === s.id ? s.color : 'border-gray-200 text-gray-500'}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Evidencia (opcional)</label>
                <button className="w-full border-2 border-dashed border-gray-300 rounded-2xl py-5 flex flex-col items-center gap-2 text-gray-400 hover:border-gray-400 transition-colors">
                  <Camera className="w-6 h-6" />
                  <span className="text-xs">Toca para adjuntar foto o video</span>
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={() => setStep('tipo')} className="flex-1 py-3.5 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-600">
                Atrás
              </button>
              <button
                onClick={() => description && setStep('ubicacion')}
                disabled={!description}
                className={`flex-1 py-3.5 rounded-2xl font-semibold text-sm transition-all ${description ? 'bg-[#001C55] text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Location */}
        {step === 'ubicacion' && (
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3">¿Dónde ocurrió el incidente?</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Zona / Lugar *</label>
                <div className="relative">
                  <select
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full appearance-none border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#001C55] bg-gray-50 pr-10"
                  >
                    <option value="">Selecciona una zona...</option>
                    {zones.map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Detalle de ubicación</label>
                <input
                  type="text"
                  placeholder="Ej: Piso 2, cerca de las mesas de estudio..."
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#001C55] bg-gray-50"
                />
              </div>

              {/* Mock map */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Marca en el mapa (opcional)</label>
                <div className="relative w-full h-36 bg-green-50 rounded-2xl border border-gray-200 overflow-hidden">
                  <svg viewBox="0 0 300 140" className="w-full h-full">
                    <rect width="300" height="140" fill="#e8f5e9" />
                    <rect x="10" y="10" width="280" height="120" rx="8" fill="#f1f8e9" stroke="#c8e6c9" strokeWidth="1" />
                    {/* Buildings */}
                    <rect x="20" y="20" width="60" height="40" rx="4" fill="#bbdefb" stroke="#90caf9" strokeWidth="1" />
                    <rect x="90" y="20" width="50" height="35" rx="4" fill="#ffecb3" stroke="#ffe082" strokeWidth="1" />
                    <rect x="150" y="15" width="70" height="45" rx="4" fill="#f8bbd0" stroke="#f48fb1" strokeWidth="1" />
                    <rect x="230" y="20" width="50" height="40" rx="4" fill="#d1c4e9" stroke="#b39ddb" strokeWidth="1" />
                    <rect x="30" y="75" width="80" height="35" rx="4" fill="#c8e6c9" stroke="#a5d6a7" strokeWidth="1" />
                    <rect x="130" y="75" width="60" height="35" rx="4" fill="#ffe0b2" stroke="#ffcc80" strokeWidth="1" />
                    <rect x="210" y="70" width="70" height="45" rx="4" fill="#b2dfdb" stroke="#80cbc4" strokeWidth="1" />
                    {/* Roads */}
                    <line x1="0" y1="65" x2="300" y2="65" stroke="#bdbdbd" strokeWidth="3" />
                    <line x1="150" y1="0" x2="150" y2="140" stroke="#bdbdbd" strokeWidth="3" />
                    {/* Pin */}
                    <circle cx="100" cy="45" r="8" fill="#C8102E" opacity="0.9" />
                    <circle cx="100" cy="45" r="4" fill="white" />
                  </svg>
                  <div className="absolute bottom-2 right-2">
                    <div className="bg-white/90 rounded-lg px-2 py-1 flex items-center gap-1 text-[10px] text-gray-600">
                      <MapPin className="w-3 h-3 text-red-500" />
                      Toca para marcar
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Resumen */}
            <div className="mt-3 bg-gray-50 rounded-2xl p-4 border border-gray-200">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Resumen del reporte</div>
              <div className="space-y-1.5 text-xs text-gray-600">
                <div className="flex gap-2"><span className="text-gray-400 w-16 shrink-0">Tipo:</span><span className="font-semibold">{incidentTypes.find(t => t.id === type)?.label}</span></div>
                <div className="flex gap-2"><span className="text-gray-400 w-16 shrink-0">Severidad:</span><span className="font-semibold capitalize">{severity || '—'}</span></div>
                <div className="flex gap-2"><span className="text-gray-400 w-16 shrink-0">Lugar:</span><span className="font-semibold">{location || '—'}</span></div>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={() => setStep('detalle')} className="flex-1 py-3.5 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-600">
                Atrás
              </button>
              <button
                onClick={handleSubmit}
                disabled={!location || loading}
                className={`flex-1 py-3.5 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${location ? 'bg-[#C8102E] text-white shadow-md shadow-red-200' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
              >
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enviando...</>
                ) : (
                  <>Enviar reporte</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
