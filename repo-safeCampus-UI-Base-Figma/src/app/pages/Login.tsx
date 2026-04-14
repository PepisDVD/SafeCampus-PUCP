import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Shield, GraduationCap, Eye, EyeOff, Lock, User, ChevronRight, Smartphone, Monitor, Tablet } from 'lucide-react';

const roles = [
  {
    id: 'estudiante',
    label: 'Estudiante / Docente / Personal',
    description: 'Reporta incidentes, Lost & Found y acompañamiento seguro',
    icon: GraduationCap,
    path: '/pwa',
    tag: 'PWA Comunidad',
    color: 'blue',
    device: Smartphone,
    user: 'María García López',
    email: 'a20201234@pucp.edu.pe',
  },
  {
    id: 'operador',
    label: 'Operador de Seguridad',
    description: 'Atiende y gestiona incidentes desde el tablero operativo móvil',
    icon: Shield,
    path: '/operador',
    tag: 'App Móvil',
    color: 'orange',
    device: Tablet,
    user: 'Jorge Salinas Torres',
    email: 'jsalinas@pucp.edu.pe',
  },
  {
    id: 'supervisor',
    label: 'Supervisor de Seguridad',
    description: 'Supervisa operaciones, KPIs y escala incidentes críticos',
    icon: Shield,
    path: '/web',
    tag: 'Web Operativa',
    color: 'navy',
    device: Monitor,
    user: 'Luis Fernández Castro',
    email: 'lfernandez@pucp.edu.pe',
  },
  {
    id: 'admin',
    label: 'Administrador del Sistema',
    description: 'Gestiona usuarios, roles, configuraciones e integraciones',
    icon: Shield,
    path: '/web/admin',
    tag: 'Web Operativa',
    color: 'purple',
    device: Monitor,
    user: 'Ana Torres Vega',
    email: 'atorres@pucp.edu.pe',
  },
];

const colorMap: Record<string, { border: string; badge: string; btn: string; icon: string; ring: string }> = {
  blue: {
    border: 'border-blue-400',
    badge: 'bg-blue-100 text-blue-700',
    btn: 'bg-blue-600 hover:bg-blue-700',
    icon: 'text-blue-600',
    ring: 'ring-blue-400',
  },
  orange: {
    border: 'border-orange-400',
    badge: 'bg-orange-100 text-orange-700',
    btn: 'bg-orange-600 hover:bg-orange-700',
    icon: 'text-orange-600',
    ring: 'ring-orange-400',
  },
  navy: {
    border: 'border-[#001C55]',
    badge: 'bg-blue-950 text-blue-200',
    btn: 'bg-[#001C55] hover:bg-[#002580]',
    icon: 'text-[#001C55]',
    ring: 'ring-[#001C55]',
  },
  purple: {
    border: 'border-purple-500',
    badge: 'bg-purple-100 text-purple-700',
    btn: 'bg-purple-700 hover:bg-purple-800',
    icon: 'text-purple-700',
    ring: 'ring-purple-400',
  },
};

export default function Login() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedRole = roles.find(r => r.id === selected);

  const handleLogin = () => {
    if (!selectedRole) return;
    setLoading(true);
    setTimeout(() => {
      navigate(selectedRole.path);
    }, 900);
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #001C55 0%, #003087 50%, #C8102E 100%)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] p-10 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full border border-white" style={{ width: `${(i + 1) * 120}px`, height: `${(i + 1) * 120}px`, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
          ))}
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="text-xs font-medium text-blue-200 tracking-widest uppercase">SafeCampus</div>
              <div className="text-xl font-bold text-white">PUCP</div>
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-4 leading-tight">Sistema Omnicanal de Gestión de Incidentes</h1>
          <p className="text-blue-200 leading-relaxed text-sm">
            Plataforma centralizada para la seguridad de la Pontificia Universidad Católica del Perú. Tres interfaces complementarias para toda la comunidad universitaria.
          </p>
        </div>

        <div className="relative z-10 space-y-3">
          {[
            { icon: Smartphone, label: 'PWA Comunidad', desc: 'Estudiantes, docentes y personal' },
            { icon: Tablet, label: 'App Móvil Operador', desc: 'Gestión táctica de campo' },
            { icon: Monitor, label: 'Web Operativa', desc: 'Supervisión y administración' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
              <item.icon className="w-4 h-4 text-blue-200 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-white">{item.label}</div>
                <div className="text-xs text-blue-300">{item.desc}</div>
              </div>
            </div>
          ))}
          <div className="pt-4 text-xs text-blue-300 text-center">MVP v1.0 · SafeCampus PUCP · 2026</div>
        </div>
      </div>

      {/* Right panel – login form */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8 bg-gray-50">
        <div className="w-full max-w-lg">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-6 justify-center">
            <div className="w-10 h-10 bg-[#001C55] rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-xs text-gray-500 tracking-widest uppercase">SafeCampus</div>
              <div className="text-lg font-bold text-[#001C55]">PUCP</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Iniciar sesión</h2>
            <p className="text-sm text-gray-500 mb-6">Credenciales institucionales PUCP</p>

            {/* Role selector */}
            <div className="mb-6">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3 block">Selecciona tu perfil</label>
              <div className="grid grid-cols-1 gap-3">
                {roles.map((role) => {
                  const colors = colorMap[role.color];
                  const isSelected = selected === role.id;
                  const DeviceIcon = role.device;
                  return (
                    <button
                      key={role.id}
                      onClick={() => setSelected(role.id)}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                        isSelected ? `${colors.border} bg-gray-50 ring-2 ${colors.ring} ring-offset-1` : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-gray-100' : 'bg-gray-100'}`}>
                        <role.icon className={`w-5 h-5 ${isSelected ? colors.icon : 'text-gray-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-semibold ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>{role.label}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors.badge} flex items-center gap-1`}>
                            <DeviceIcon className="w-3 h-3" />
                            {role.tag}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{role.description}</p>
                      </div>
                      {isSelected && <ChevronRight className={`w-4 h-4 ${colors.icon} shrink-0`} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Credentials */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5 block">Usuario institucional</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    defaultValue={selectedRole?.email || ''}
                    key={selectedRole?.email}
                    placeholder="usuario@pucp.edu.pe"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#001C55] bg-gray-50 focus:bg-white transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5 block">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    defaultValue="••••••••"
                    className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#001C55] bg-gray-50 focus:bg-white transition-colors"
                  />
                  <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={!selected || loading}
              className={`w-full py-3 px-6 rounded-xl text-white font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                selected && !loading
                  ? `${colorMap[selectedRole?.color || 'navy'].btn} shadow-lg hover:shadow-xl`
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Autenticando...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Iniciar sesión con PUCP SSO
                </>
              )}
            </button>

            <p className="text-center text-xs text-gray-400 mt-4">
              Autenticación segura via Shibboleth · PUCP DITIC
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
