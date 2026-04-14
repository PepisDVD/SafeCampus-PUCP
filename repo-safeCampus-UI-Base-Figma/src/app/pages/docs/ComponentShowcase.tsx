import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Shield, MapPin, AlertTriangle, CheckCircle, Clock, Search,
  ChevronRight, Bell, Settings, FileText, BarChart3, Eye,
  Trash2, Edit, Plus, Info, Download, Upload, X, Filter,
  MessageCircle, User, Mail, Lock, Radio, Zap, ArrowLeft,
  Megaphone, Navigation, Camera, Heart, Star, Copy, ExternalLink, Printer,
  TrendingUp, TrendingDown, Layers, Activity, Smartphone, Monitor,
  LogOut, Menu, ChevronDown, Phone, Hash, Wifi,
} from 'lucide-react';

// shadcn/ui components
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { Switch } from '../../components/ui/switch';
import { Progress } from '../../components/ui/progress';
import { Skeleton } from '../../components/ui/skeleton';
import { Separator } from '../../components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../../components/ui/accordion';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/alert';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Slider } from '../../components/ui/slider';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Popover, PopoverTrigger, PopoverContent } from '../../components/ui/popover';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '../../components/ui/dropdown-menu';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../../components/ui/sheet';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';

// ─── Helpers ────────────────────────────────────────
const SectionTitle = ({ children, id }: { children: React.ReactNode; id: string }) => (
  <div id={id} className="scroll-mt-20">
    <h2 className="text-xl font-bold text-gray-900 mb-1">{children}</h2>
    <Separator className="mb-6" />
  </div>
);

const SubSection = ({ title, source, children }: { title: string; source: string; children: React.ReactNode }) => (
  <div className="mb-8">
    <div className="flex items-center gap-3 mb-3">
      <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{source}</span>
    </div>
    <div className="border border-gray-200 rounded-xl p-5 bg-white">{children}</div>
  </div>
);

const CodeLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[11px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{children}</span>
);

// ─── Nav sections ───────────────────────────────────
const sections = [
  { id: 'tokens', label: 'Design Tokens' },
  { id: 'buttons', label: 'Botones' },
  { id: 'badges', label: 'Badges' },
  { id: 'cards', label: 'Cards' },
  { id: 'inputs', label: 'Inputs y Formularios' },
  { id: 'overlays', label: 'Overlays y Modales' },
  { id: 'navigation', label: 'Navegación y Estructura' },
  { id: 'feedback', label: 'Feedback del Sistema' },
  { id: 'data', label: 'Data Display' },
  { id: 'custom-pwa', label: 'Patrones Custom PWA' },
  { id: 'custom-op', label: 'Patrones Custom Operador' },
  { id: 'custom-web', label: 'Patrones Custom Web' },
  { id: 'layouts', label: 'Layouts (Web/PWA/Móvil)' },
  { id: 'kpis', label: 'Métricas KPI y SLA' },
  { id: 'timelines', label: 'Timelines y Flujos' },
  { id: 'campus-map', label: 'Mapa del Campus' },
  { id: 'charts', label: 'Gráficos' },
  { id: 'indicators', label: 'Indicadores Especializados' },
  { id: 'interaction', label: 'Patrones de Interacción' },
  { id: 'screens', label: 'Pantallas del Sistema' },
  { id: 'icons', label: 'Iconografía' },
];

// ─── Main Component ─────────────────────────────────
export default function ComponentShowcase() {
  const navigate = useNavigate();
  const [demoProgress, setDemoProgress] = useState(65);
  const [demoSlider, setDemoSlider] = useState([40]);
  const [demoSwitch, setDemoSwitch] = useState(true);
  const [demoCheck1, setDemoCheck1] = useState(true);
  const [demoCheck2, setDemoCheck2] = useState(false);
  const [demoInput, setDemoInput] = useState('');
  const [demoTextarea, setDemoTextarea] = useState('');
  const [demoSelect, setDemoSelect] = useState('');
  const [chipActive, setChipActive] = useState('todos');
  const [wizardStep, setWizardStep] = useState(1);
  const [sosBounce, setSosBounce] = useState(false);
  const [demoToastVisible, setDemoToastVisible] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterSeverity, setFilterSeverity] = useState('todos');
  const [confirmStep, setConfirmStep] = useState<'idle' | 'loading' | 'success'>('idle');

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Fixed header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm print:static print:shadow-none">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 transition-colors print:hidden">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-medium">Volver</span>
            </button>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#001C55] rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900 leading-none">SafeCampus UI Kit</div>
                <div className="text-[10px] text-gray-400">Documentación de Componentes</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 print:hidden">
            <span className="text-[10px] text-gray-400 font-mono">v1.0 · shadcn/ui + Tailwind + Custom</span>
            <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Exportar PDF
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Side nav */}
        <nav className="hidden lg:block w-56 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] border-r border-gray-200 bg-white overflow-y-auto py-4 px-3 print:hidden">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Secciones</div>
          {sections.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="block px-3 py-1.5 text-xs font-medium text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              {s.label}
            </a>
          ))}
        </nav>

        {/* Content */}
        <main className="flex-1 min-w-0 px-6 py-8 space-y-12">

          {/* ════════════════════ 1. DESIGN TOKENS ════════════════════ */}
          <section>
            <SectionTitle id="tokens">1. Design Tokens</SectionTitle>

            <SubSection title="Paleta de Colores de Marca" source="theme.css + páginas">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { name: 'Navy Principal', hex: '#001C55', tw: 'bg-[#001C55]', text: 'text-white' },
                  { name: 'Azul Secundario', hex: '#003087', tw: 'bg-[#003087]', text: 'text-white' },
                  { name: 'Rojo PUCP', hex: '#C8102E', tw: 'bg-[#C8102E]', text: 'text-white' },
                  { name: 'Primary Token', hex: '#030213', tw: 'bg-[#030213]', text: 'text-white' },
                  { name: 'Dark Base', hex: '#0d1117', tw: 'bg-[#0d1117]', text: 'text-white' },
                  { name: 'Dark Surface', hex: '#161b22', tw: 'bg-[#161b22]', text: 'text-white' },
                  { name: 'WhatsApp', hex: '#25D366', tw: 'bg-[#25D366]', text: 'text-white' },
                  { name: 'Destructive', hex: '#d4183d', tw: 'bg-[#d4183d]', text: 'text-white' },
                ].map(c => (
                  <div key={c.hex} className="rounded-xl overflow-hidden border border-gray-200">
                    <div className={`${c.tw} ${c.text} h-16 flex items-end p-2`}>
                      <span className="text-[10px] font-mono opacity-80">{c.hex}</span>
                    </div>
                    <div className="px-2 py-1.5 bg-white">
                      <div className="text-xs font-semibold text-gray-800">{c.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </SubSection>

            <SubSection title="Colores de Severidad" source="mockData.ts · severityConfig">
              <div className="flex gap-3 flex-wrap">
                {[
                  { label: 'Crítico', color: 'bg-red-500', hex: '#EF4444' },
                  { label: 'Alto', color: 'bg-orange-400', hex: '#FB923C' },
                  { label: 'Medio', color: 'bg-amber-400', hex: '#FBBF24' },
                  { label: 'Bajo', color: 'bg-green-500', hex: '#22C55E' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2 bg-gray-50 rounded-full px-3 py-1.5">
                    <div className={`w-3 h-3 rounded-full ${s.color}`} />
                    <span className="text-xs font-semibold text-gray-700">{s.label}</span>
                    <span className="text-[10px] font-mono text-gray-400">{s.hex}</span>
                  </div>
                ))}
              </div>
            </SubSection>

            <SubSection title="Colores de Estado" source="mockData.ts · statusBadgeColor">
              <div className="flex gap-3 flex-wrap">
                {[
                  { label: 'Nuevo', bg: 'bg-blue-100 text-blue-700' },
                  { label: 'En atención', bg: 'bg-amber-100 text-amber-700' },
                  { label: 'Pendiente', bg: 'bg-orange-100 text-orange-700' },
                  { label: 'Resuelto', bg: 'bg-green-100 text-green-700' },
                  { label: 'Cerrado', bg: 'bg-gray-100 text-gray-600' },
                ].map(s => (
                  <span key={s.label} className={`text-xs font-bold px-3 py-1 rounded-full ${s.bg}`}>{s.label}</span>
                ))}
              </div>
            </SubSection>

            <SubSection title="Colores de Roles" source="Login.tsx · WebAdmin.tsx">
              <div className="flex gap-3 flex-wrap">
                {[
                  { label: 'Comunidad', bg: 'bg-blue-50 text-blue-600 border-blue-200', dot: 'bg-blue-500' },
                  { label: 'Operador', bg: 'bg-orange-50 text-orange-600 border-orange-200', dot: 'bg-orange-500' },
                  { label: 'Supervisor', bg: 'bg-green-50 text-green-600 border-green-200', dot: 'bg-green-500' },
                  { label: 'Admin', bg: 'bg-purple-50 text-purple-600 border-purple-200', dot: 'bg-purple-500' },
                ].map(r => (
                  <span key={r.label} className={`text-xs font-bold px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${r.bg}`}>
                    <div className={`w-2 h-2 rounded-full ${r.dot}`} />
                    {r.label}
                  </span>
                ))}
              </div>
            </SubSection>

            <SubSection title="Tipografía (Escala Tailwind usada)" source="Todas las páginas">
              <div className="space-y-3">
                {[
                  { cls: 'text-3xl font-bold', label: 'text-3xl · 30px · Reloj operador' },
                  { cls: 'text-2xl font-bold', label: 'text-2xl · 24px · Timer, valores destac.' },
                  { cls: 'text-xl font-bold', label: 'text-xl · 20px · Stats, KPIs grandes' },
                  { cls: 'text-lg font-bold', label: 'text-lg · 18px · Títulos de sección (h2)' },
                  { cls: 'text-base font-semibold', label: 'text-base · 16px · Botones primarios' },
                  { cls: 'text-sm font-semibold', label: 'text-sm · 14px · Cards, subtítulos' },
                  { cls: 'text-xs font-medium', label: 'text-xs · 12px · Body principal (PWA)' },
                  { cls: 'text-[11px] font-normal', label: 'text-[11px] · Notificaciones' },
                  { cls: 'text-[10px] font-semibold', label: 'text-[10px] · Labels de tabs, meta' },
                  { cls: 'text-[9px] font-bold', label: 'text-[9px] · Badges compactos' },
                ].map(t => (
                  <div key={t.label} className="flex items-baseline gap-4">
                    <span className={`${t.cls} text-gray-900 w-48 shrink-0`}>SafeCampus</span>
                    <span className="text-[11px] text-gray-400 font-mono">{t.label}</span>
                  </div>
                ))}
              </div>
            </SubSection>

            <SubSection title="Border Radius" source="Componentes y páginas">
              <div className="flex gap-4 flex-wrap items-end">
                {[
                  { cls: 'rounded-md', label: 'rounded-md (6px)', size: 'w-14 h-14' },
                  { cls: 'rounded-lg', label: 'rounded-lg (8px)', size: 'w-14 h-14' },
                  { cls: 'rounded-xl', label: 'rounded-xl (12px)', size: 'w-14 h-14' },
                  { cls: 'rounded-2xl', label: 'rounded-2xl (16px)', size: 'w-16 h-16' },
                  { cls: 'rounded-3xl', label: 'rounded-3xl (24px)', size: 'w-16 h-16' },
                  { cls: 'rounded-full', label: 'rounded-full', size: 'w-14 h-14' },
                ].map(r => (
                  <div key={r.label} className="flex flex-col items-center gap-1.5">
                    <div className={`${r.size} bg-[#001C55] ${r.cls}`} />
                    <span className="text-[10px] text-gray-500 font-mono">{r.label}</span>
                  </div>
                ))}
              </div>
            </SubSection>

            <SubSection title="Sombras" source="Páginas">
              <div className="flex gap-5 flex-wrap">
                {[
                  { cls: 'shadow-sm', label: 'shadow-sm · Cards' },
                  { cls: 'shadow-md', label: 'shadow-md · Alerts' },
                  { cls: 'shadow-lg', label: 'shadow-lg · CTAs' },
                  { cls: 'shadow-xl', label: 'shadow-xl · Modales' },
                  { cls: 'shadow-2xl', label: 'shadow-2xl · Frame' },
                ].map(s => (
                  <div key={s.label} className="flex flex-col items-center gap-2">
                    <div className={`w-20 h-20 bg-white rounded-xl border border-gray-100 ${s.cls}`} />
                    <span className="text-[10px] text-gray-500 font-mono">{s.label}</span>
                  </div>
                ))}
              </div>
            </SubSection>
          </section>

          {/* ════════════════════ 2. BUTTONS ════════════════════ */}
          <section>
            <SectionTitle id="buttons">2. Botones</SectionTitle>

            <SubSection title="shadcn/ui Button — Variantes" source="components/ui/button.tsx">
              <div className="space-y-4">
                <div className="flex gap-3 flex-wrap items-center">
                  <Button variant="default">Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                </div>
                <div className="flex gap-3 flex-wrap items-center">
                  <Button size="sm"><Plus className="w-3 h-3" /> Small</Button>
                  <Button size="default"><Plus className="w-4 h-4" /> Default</Button>
                  <Button size="lg"><Plus className="w-4 h-4" /> Large</Button>
                  <Button size="icon"><Plus /></Button>
                </div>
                <div className="flex gap-3 flex-wrap items-center">
                  <Button disabled>Disabled</Button>
                  <Button variant="outline" disabled>Disabled Outline</Button>
                </div>
              </div>
            </SubSection>

            <SubSection title="Botones Custom del Proyecto — Tema Claro (PWA)" source="PWAReportar.tsx · PWAHome.tsx">
              <div className="space-y-3">
                <div className="flex gap-3 flex-wrap">
                  <button className="bg-[#001C55] text-white px-6 py-3 rounded-xl text-xs font-semibold hover:bg-[#002580] transition-colors flex items-center gap-2">
                    <Navigation className="w-4 h-4" /> Primario PWA
                  </button>
                  <button className="border-2 border-gray-200 text-gray-600 px-6 py-3 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors">
                    Secundario PWA
                  </button>
                  <button className="bg-red-600 text-white px-6 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-200">
                    <AlertTriangle className="w-4 h-4" /> SOS Emergencia
                  </button>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <button className="bg-green-600 text-white px-6 py-3.5 rounded-2xl text-sm font-semibold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Confirmar acción
                  </button>
                  <button className="bg-gray-200 text-gray-400 px-6 py-3 rounded-2xl text-xs font-bold cursor-not-allowed">
                    Deshabilitado
                  </button>
                </div>
              </div>
            </SubSection>

            <SubSection title="Botones Custom — Tema Oscuro (Operador)" source="OperadorDashboard.tsx">
              <div className="bg-[#0d1117] rounded-2xl p-5 space-y-3">
                <div className="flex gap-3 flex-wrap">
                  <button className="bg-orange-500 text-white px-6 py-3 rounded-2xl text-xs font-bold hover:bg-orange-600 transition-colors flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Primario Operador
                  </button>
                  <button className="border border-gray-700 text-gray-300 px-6 py-3 rounded-2xl text-xs font-semibold hover:border-gray-500 transition-colors bg-[#161b22]">
                    Secundario Operador
                  </button>
                  <button className="bg-red-600 text-white px-6 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-pulse">
                    <Megaphone className="w-4 h-4" /> Emergencia
                  </button>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <button className="bg-green-600 text-white px-6 py-3.5 rounded-2xl text-sm font-bold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Marcar resuelto
                  </button>
                  <button className="text-gray-500 text-[10px] border border-gray-700 px-3 py-1.5 rounded-lg hover:border-gray-500 transition-colors">
                    Mini action
                  </button>
                </div>
              </div>
            </SubSection>

            <SubSection title="Botón SOS — Simulación Interactiva" source="PWAHome.tsx · PWAAcompanamiento.tsx">
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => { setSosBounce(true); setTimeout(() => setSosBounce(false), 600); }}
                  className={`bg-red-600 text-white py-4 px-8 rounded-2xl font-bold text-base flex items-center gap-3 shadow-lg shadow-red-200 transition-transform ${sosBounce ? 'scale-95' : 'hover:scale-[1.02]'}`}
                >
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  EMERGENCIA SOS
                </button>
                <span className="text-[10px] text-gray-400">Click para ver efecto de presión (active:scale)</span>
              </div>
            </SubSection>
          </section>

          {/* ════════════════════ 3. BADGES ════════════════════ */}
          <section>
            <SectionTitle id="badges">3. Badges</SectionTitle>

            <SubSection title="shadcn/ui Badge — Variantes" source="components/ui/badge.tsx">
              <div className="flex gap-3 flex-wrap">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
            </SubSection>

            <SubSection title="Badges Custom de Estado (tema claro)" source="WebCasos.tsx · PWAMisCasos.tsx">
              <div className="flex gap-2 flex-wrap">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">NUEVO</span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">EN ATENCIÓN</span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">PENDIENTE</span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">RESUELTO</span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">CERRADO</span>
              </div>
            </SubSection>

            <SubSection title="Badges Custom de Estado (tema oscuro — Operador)" source="OperadorIncidentes.tsx">
              <div className="bg-[#0d1117] rounded-2xl p-4 flex gap-2 flex-wrap">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">NUEVO</span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">EN ATENCIÓN</span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">PENDIENTE</span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">RESUELTO</span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400">CERRADO</span>
              </div>
            </SubSection>

            <SubSection title="Severity Dots" source="OperadorDashboard.tsx · WebDashboard.tsx">
              <div className="flex gap-4 flex-wrap items-center">
                {[
                  { label: 'Crítico', color: 'bg-red-500', pulse: true },
                  { label: 'Alto', color: 'bg-orange-400', pulse: false },
                  { label: 'Medio', color: 'bg-amber-400', pulse: false },
                  { label: 'Bajo', color: 'bg-green-500', pulse: false },
                ].map(d => (
                  <div key={d.label} className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${d.color} ${d.pulse ? 'animate-pulse' : ''}`} />
                    <span className="text-xs text-gray-600">{d.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-2">El dot de "Crítico" usa animate-pulse para indicar urgencia.</p>
            </SubSection>

            <SubSection title="Notification Badge" source="WebLayout.tsx · PWAPerfil.tsx">
              <div className="flex gap-6 items-center">
                <div className="relative">
                  <Bell className="w-5 h-5 text-gray-600" />
                  <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold text-white bg-red-500 w-4 h-4 rounded-full flex items-center justify-center">3</span>
                </div>
                <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">5 nuevas</span>
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-[10px] text-gray-400">← Unread indicator</span>
              </div>
            </SubSection>
          </section>

          {/* ════════════════════ 4. CARDS ════════════════════ */}
          <section>
            <SectionTitle id="cards">4. Cards</SectionTitle>

            <SubSection title="shadcn/ui Card" source="components/ui/card.tsx">
              <div className="grid sm:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Título de Card</CardTitle>
                    <CardDescription>Descripción breve del contenido de la card.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">Contenido principal aquí. Las cards de shadcn/ui usan tokens semánticos (bg-card, text-card-foreground).</p>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2">
                    <Button variant="outline" size="sm">Cancelar</Button>
                    <Button size="sm">Guardar</Button>
                  </CardFooter>
                </Card>

                <Card className="border-l-4 border-l-red-500">
                  <CardHeader>
                    <CardTitle>Card con borde de severidad</CardTitle>
                    <CardDescription>Patrón usado en listas de incidentes.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-xs font-bold text-red-600">INC-2026-001</span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">CRÍTICO</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </SubSection>

            <SubSection title="Card Pattern PWA (tema claro)" source="PWAHome.tsx · PWAMisCasos.tsx">
              <div className="max-w-sm space-y-3">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="w-2 h-2 bg-amber-400 rounded-full" />
                        <span className="text-[10px] font-mono text-gray-400">INC-2026-003</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">EN ATENCIÓN</span>
                      </div>
                      <div className="text-sm font-semibold text-gray-800 line-clamp-1">Robo de laptop en Biblioteca Central</div>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                        <MapPin className="w-3 h-3" /> Zona Central · 14:30
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                  </div>
                </div>
                <p className="text-[10px] text-gray-400">Patrón: bg-white rounded-2xl border border-gray-100 shadow-sm</p>
              </div>
            </SubSection>

            <SubSection title="Card Pattern Operador (tema oscuro)" source="OperadorDashboard.tsx · OperadorIncidentes.tsx">
              <div className="max-w-sm bg-[#0d1117] rounded-2xl p-4 space-y-3">
                <div className="bg-[#161b22] rounded-2xl p-4 border-l-4 border-l-red-500 border border-gray-800">
                  <div className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1 shrink-0 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-gray-500 text-[10px] font-mono">INC-2026-001</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">CRÍTICO</span>
                      </div>
                      <div className="text-white text-sm font-semibold line-clamp-1">Intento de robo en Estacionamiento</div>
                      <div className="flex items-center gap-1 mt-1 text-gray-500 text-[10px]">
                        <MapPin className="w-3 h-3" /> Zona Ciencias · 08:45
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />
                  </div>
                </div>
                <p className="text-[10px] text-gray-500">Patrón: bg-[#161b22] rounded-2xl border border-gray-800 + border-l severity</p>
              </div>
            </SubSection>

            <SubSection title="KPI Card" source="WebDashboard.tsx · WebKPIs.tsx">
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { label: 'Total Incidentes', value: '24', icon: FileText, color: 'text-blue-500 bg-blue-50', trend: '+12%', trendColor: 'text-green-500' },
                  { label: 'Tiempo de Respuesta', value: '3.8m', icon: Clock, color: 'text-amber-500 bg-amber-50', trend: '-8%', trendColor: 'text-green-500' },
                  { label: 'Casos Críticos', value: '3', icon: AlertTriangle, color: 'text-red-500 bg-red-50', trend: '+2', trendColor: 'text-red-500' },
                ].map(k => (
                  <div key={k.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.color}`}>
                        <k.icon className="w-5 h-5" />
                      </div>
                      <span className={`text-xs font-bold ${k.trendColor}`}>{k.trend}</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{k.value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
                  </div>
                ))}
              </div>
            </SubSection>

            <SubSection title="Hero / Banner Card" source="PWAHome.tsx · PWAAcompanamiento.tsx">
              <div className="max-w-sm">
                <div className="bg-gradient-to-br from-[#001C55] to-[#003087] rounded-3xl p-6 text-white text-center">
                  <div className="w-16 h-16 bg-white/15 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-base mb-2">Banner Hero</h3>
                  <p className="text-blue-200 text-xs leading-relaxed">Usado en pantallas de inicio y acompañamiento con gradiente institucional.</p>
                </div>
              </div>
            </SubSection>
          </section>

          {/* ════════════════════ 5. INPUTS & FORMS ════════════════════ */}
          <section>
            <SectionTitle id="inputs">5. Inputs y Formularios</SectionTitle>

            <SubSection title="shadcn/ui Input + Label + Textarea + Select" source="components/ui/">
              <div className="max-w-md space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="demo-in">Email institucional</Label>
                  <Input id="demo-in" type="email" placeholder="usuario@pucp.edu.pe" value={demoInput} onChange={e => setDemoInput(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="demo-ta">Descripción</Label>
                  <Textarea id="demo-ta" placeholder="Describe lo que ocurrió..." value={demoTextarea} onChange={e => setDemoTextarea(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Zona del campus</Label>
                  <Select value={demoSelect} onValueChange={setDemoSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una zona..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="central">Zona Central</SelectItem>
                      <SelectItem value="ciencias">Zona Ciencias</SelectItem>
                      <SelectItem value="letras">Zona Letras</SelectItem>
                      <SelectItem value="deportes">Zona Deportiva</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Input deshabilitado</Label>
                  <Input disabled placeholder="Campo no editable" />
                </div>
              </div>
            </SubSection>

            <SubSection title="Checkbox y Switch" source="components/ui/checkbox.tsx · switch.tsx">
              <div className="space-y-4 max-w-md">
                <div className="flex items-center gap-3">
                  <Checkbox id="c1" checked={demoCheck1} onCheckedChange={(v) => setDemoCheck1(v === true)} />
                  <Label htmlFor="c1">Notificaciones push activadas</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox id="c2" checked={demoCheck2} onCheckedChange={(v) => setDemoCheck2(v === true)} />
                  <Label htmlFor="c2">Compartir ubicación en tiempo real</Label>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label>Modo oscuro</Label>
                  <Switch checked={demoSwitch} onCheckedChange={setDemoSwitch} />
                </div>
                <p className="text-[10px] text-gray-400">Switch estado: {demoSwitch ? 'Activado' : 'Desactivado'}</p>
              </div>
            </SubSection>

            <SubSection title="Slider" source="components/ui/slider.tsx">
              <div className="max-w-md space-y-2">
                <Label>Duración estimada: {demoSlider[0]} min</Label>
                <Slider value={demoSlider} onValueChange={setDemoSlider} min={5} max={60} step={5} />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>5 min</span>
                  <span>60 min</span>
                </div>
              </div>
            </SubSection>

            <SubSection title="Inputs Custom PWA (tema claro)" source="PWAReportar.tsx · PWALostFound.tsx">
              <div className="max-w-sm space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Descripción del incidente</label>
                  <textarea
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#001C55] bg-gray-50 resize-none"
                    rows={3}
                    placeholder="Detalla lo que ocurrió..."
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Ubicación</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      className="w-full border border-gray-200 rounded-xl pl-10 pr-3 py-2.5 text-xs focus:outline-none focus:border-[#001C55] bg-gray-50"
                      placeholder="Buscar ubicación..."
                    />
                  </div>
                </div>
              </div>
            </SubSection>

            <SubSection title="Inputs Custom Operador (tema oscuro)" source="OperadorIncidentes.tsx">
              <div className="max-w-sm bg-[#0d1117] rounded-2xl p-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    className="w-full pl-10 pr-4 py-3 bg-[#161b22] border border-gray-800 rounded-2xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
                    placeholder="Buscar por ID o título..."
                  />
                </div>
                <textarea
                  className="w-full bg-[#161b22] border border-gray-700 rounded-2xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 resize-none"
                  rows={3}
                  placeholder="Escribe una actualización operativa..."
                />
              </div>
            </SubSection>
          </section>

          {/* ════════════════════ 6. OVERLAYS ════════════════════ */}
          <section>
            <SectionTitle id="overlays">6. Overlays y Modales</SectionTitle>

            <SubSection title="Dialog (shadcn/ui)" source="components/ui/dialog.tsx">
              <div className="flex gap-3 flex-wrap">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>Abrir Dialog</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirmar acción</DialogTitle>
                      <DialogDescription>¿Estás seguro de que quieres escalar este incidente al supervisor?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline">Cancelar</Button>
                      <Button>Confirmar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="destructive">Dialog Destructivo</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cerrar incidente</DialogTitle>
                      <DialogDescription>Esta acción marcará el incidente como cerrado y no podrá reabrirse.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline">Cancelar</Button>
                      <Button variant="destructive">Cerrar incidente</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </SubSection>

            <SubSection title="Sheet (Panel lateral)" source="components/ui/sheet.tsx">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline">Abrir Sheet →</Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Detalle del Incidente</SheetTitle>
                    <SheetDescription>INC-2026-003 · Robo de laptop</SheetDescription>
                  </SheetHeader>
                  <div className="py-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Estado</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">EN ATENCIÓN</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Severidad</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-orange-400 rounded-full" />
                        <span className="font-medium">Alto</span>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Zona</span>
                      <span className="font-medium">Zona Central</span>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </SubSection>

            <SubSection title="Popover" source="components/ui/popover.tsx">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm"><Info className="w-3 h-3" /> Info Popover</Button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold">Tiempo de Respuesta (FRT)</h4>
                    <p className="text-xs text-gray-500">Promedio de tiempo desde la creación del ticket hasta la primera respuesta del operador.</p>
                    <p className="text-xs text-gray-500">Meta SLA: {"<"} 5 minutos para críticos.</p>
                  </div>
                </PopoverContent>
              </Popover>
            </SubSection>

            <SubSection title="Tooltip" source="components/ui/tooltip.tsx">
              <div className="flex gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon"><Eye className="w-4 h-4" /></Button>
                  </TooltipTrigger>
                  <TooltipContent>Ver detalle</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon"><Edit className="w-4 h-4" /></Button>
                  </TooltipTrigger>
                  <TooltipContent>Editar</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon"><Trash2 className="w-4 h-4" /></Button>
                  </TooltipTrigger>
                  <TooltipContent>Eliminar</TooltipContent>
                </Tooltip>
              </div>
            </SubSection>

            <SubSection title="Dropdown Menu" source="components/ui/dropdown-menu.tsx">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">Acciones <ChevronRight className="w-3 h-3 rotate-90" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem><Eye className="w-4 h-4" /> Ver detalle</DropdownMenuItem>
                  <DropdownMenuItem><Edit className="w-4 h-4" /> Editar</DropdownMenuItem>
                  <DropdownMenuItem><User className="w-4 h-4" /> Reasignar</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive"><Trash2 className="w-4 h-4" /> Eliminar</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SubSection>
          </section>

          {/* ════════════════════ 7. NAVIGATION ════════════════════ */}
          <section>
            <SectionTitle id="navigation">7. Navegación y Estructura</SectionTitle>

            <SubSection title="Tabs (shadcn/ui)" source="components/ui/tabs.tsx">
              <Tabs defaultValue="general">
                <TabsList>
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="seguridad">Seguridad</TabsTrigger>
                  <TabsTrigger value="notificaciones">Notificaciones</TabsTrigger>
                </TabsList>
                <TabsContent value="general" className="mt-3">
                  <p className="text-sm text-gray-600">Contenido de la pestaña General. Tabs shadcn/ui usando Radix para accesibilidad.</p>
                </TabsContent>
                <TabsContent value="seguridad" className="mt-3">
                  <p className="text-sm text-gray-600">Contenido de la pestaña Seguridad.</p>
                </TabsContent>
                <TabsContent value="notificaciones" className="mt-3">
                  <p className="text-sm text-gray-600">Contenido de la pestaña Notificaciones.</p>
                </TabsContent>
              </Tabs>
            </SubSection>

            <SubSection title="Bottom Tab Bar — PWA" source="PWALayout.tsx">
              <div className="max-w-[430px] mx-auto">
                <div className="bg-white rounded-2xl border border-gray-200 flex shadow-lg">
                  {[
                    { icon: Shield, label: 'Inicio', active: true },
                    { icon: AlertTriangle, label: 'Reportar', active: false },
                    { icon: FileText, label: 'Mis casos', active: false },
                    { icon: Search, label: 'Lost & Found', active: false },
                    { icon: User, label: 'Perfil', active: false },
                  ].map(item => (
                    <div key={item.label} className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 ${item.active ? 'text-[#001C55]' : 'text-gray-400'}`}>
                      <div className={`p-1.5 rounded-xl ${item.active ? 'bg-[#001C55]/10' : ''}`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-medium">{item.label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 text-center mt-2">Activo: text-[#001C55] + bg-[#001C55]/10</p>
              </div>
            </SubSection>

            <SubSection title="Bottom Tab Bar — Operador (oscuro)" source="OperadorLayout.tsx">
              <div className="max-w-[430px] mx-auto">
                <div className="bg-[#161b22] rounded-2xl border border-gray-700 flex">
                  {[
                    { icon: Shield, label: 'Dashboard', active: true },
                    { icon: FileText, label: 'Incidentes', active: false },
                    { icon: MapPin, label: 'Mapa', active: false },
                    { icon: User, label: 'Perfil', active: false },
                  ].map(item => (
                    <div key={item.label} className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 ${item.active ? 'text-orange-400' : 'text-gray-600'}`}>
                      <div className={`p-1.5 rounded-xl ${item.active ? 'bg-orange-500/15' : ''}`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-medium">{item.label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-500 text-center mt-2">Activo: text-orange-400 + bg-orange-500/15</p>
              </div>
            </SubSection>

            <SubSection title="Filter Chips" source="OperadorIncidentes.tsx · PWALostFound.tsx">
              <div className="space-y-3">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {['Todos', 'Nuevo', 'En atención', 'Pendiente', 'Resuelto'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setChipActive(opt.toLowerCase())}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all shrink-0 ${chipActive === opt.toLowerCase() ? 'bg-[#001C55] text-white border-[#001C55]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400">Click en los chips para ver el cambio de estado activo/inactivo.</p>
              </div>
            </SubSection>

            <SubSection title="Sidebar Web — Componente Completo" source="WebLayout.tsx">
              <div className="grid lg:grid-cols-[auto_1fr] gap-4">
                <div className="w-64 bg-[#001C55] rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
                    <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm">SafeCampus</div>
                      <div className="text-blue-300 text-[10px]">PUCP · Web Operativa</div>
                    </div>
                  </div>
                  <nav className="p-2 space-y-1">
                    {[
                      { icon: BarChart3, label: 'Dashboard', active: true },
                      { icon: FileText, label: 'Gestión de Casos', active: false },
                      { icon: BarChart3, label: 'KPIs y Reportes', active: false },
                      { icon: MessageCircle, label: 'WhatsApp', active: false },
                      { icon: Settings, label: 'Admin Sistema', active: false },
                    ].map(item => (
                      <div key={item.label} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors ${item.active ? 'bg-white/15 text-white' : 'text-blue-200 hover:bg-white/10'}`}>
                        <item.icon className={`w-5 h-5 ${item.active ? 'text-white' : 'text-blue-300'}`} />
                        {item.label}
                      </div>
                    ))}
                  </nav>
                  <div className="mx-3 mb-3 bg-red-500/20 border border-red-400/30 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <div>
                        <div className="text-white text-xs font-bold">2 críticos activos</div>
                        <div className="text-red-300 text-[10px]">Requieren atención</div>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-white/10 p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white text-sm font-bold">LF</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-xs font-semibold truncate">Luis Fernández</div>
                        <div className="text-blue-300 text-[10px] truncate">Supervisor</div>
                      </div>
                      <LogOut className="w-4 h-4 text-blue-300" />
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-gray-500 space-y-2 self-center">
                  <p><CodeLabel>bg-[#001C55]</CodeLabel> Fondo navy institucional</p>
                  <p><CodeLabel>w-64</CodeLabel> Ancho estándar (256px), colapsable a <CodeLabel>w-16</CodeLabel></p>
                  <p>Activo: <CodeLabel>bg-white/15 text-white</CodeLabel></p>
                  <p>Inactivo: <CodeLabel>text-blue-200 hover:bg-white/10</CodeLabel></p>
                  <p>Badge de alertas críticas integrado</p>
                  <p>Avatar + info de usuario en parte inferior</p>
                </div>
              </div>
            </SubSection>

            <SubSection title="Barra Superior (Top Bar)" source="WebLayout.tsx">
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                  <Menu className="w-5 h-5" />
                </button>
                <div className="flex-1" />
                <div className="flex items-center gap-1 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs font-semibold text-red-600">2 críticos</span>
                </div>
                <button className="relative p-2 rounded-xl hover:bg-gray-100 text-gray-500">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                </button>
                <div className="flex items-center gap-2 border-l border-gray-200 pl-3 ml-1">
                  <div className="w-8 h-8 bg-[#001C55] rounded-xl flex items-center justify-center text-white text-xs font-bold">LF</div>
                  <div>
                    <div className="text-xs font-semibold text-gray-700">Luis</div>
                    <div className="text-[10px] text-gray-400">Supervisor</div>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">Incluye: hamburger móvil, alerta crítica en vivo, campana de notificaciones con badge, avatar +  rol.</p>
            </SubSection>

            <SubSection title="Panel Lateral de Detalle" source="WebCasos.tsx">
              <div className="flex gap-3 max-w-2xl">
                <div className="flex-1 space-y-2">
                  {[
                    { id: 'INC-001', title: 'Intento de robo', sev: 'bg-red-500', active: true },
                    { id: 'INC-002', title: 'Persona sospechosa', sev: 'bg-orange-400', active: false },
                    { id: 'INC-003', title: 'Robo de laptop', sev: 'bg-orange-400', active: false },
                  ].map(item => (
                    <div key={item.id} className={`bg-white rounded-xl p-3 border cursor-pointer transition-all ${item.active ? 'border-[#001C55] shadow-md' : 'border-gray-100 hover:border-gray-300'}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${item.sev}`} />
                        <span className="text-[10px] font-mono text-gray-400">{item.id}</span>
                      </div>
                      <div className="text-xs font-semibold text-gray-800 mt-1">{item.title}</div>
                    </div>
                  ))}
                </div>
                <div className="w-72 bg-white rounded-xl border border-gray-200 shadow-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-bold text-gray-900">INC-001</div>
                    <button className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="text-xs font-semibold text-gray-800 mb-3">Intento de robo en Estacionamiento</div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <div className="text-[10px] text-gray-400">Estado</div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">NUEVO</span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <div className="text-[10px] text-gray-400">Severidad</div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full" /><span className="text-[10px] font-bold text-red-600">Crítico</span></div>
                    </div>
                  </div>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between"><span className="text-gray-400">Zona</span><span className="font-medium">Ciencias</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Canal</span><span className="font-medium">PWA</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Asignado</span><span className="font-medium">J. Sánchez</span></div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" className="flex-1 text-[10px]">Escalar</Button>
                    <Button size="sm" variant="outline" className="flex-1 text-[10px]">Cerrar</Button>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">Patrón maestro-detalle: lista izquierda + panel de detalle derecho con acciones.</p>
            </SubSection>

            <SubSection title="Barra de Filtros Completa" source="WebCasos.tsx · OperadorIncidentes.tsx">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:border-[#001C55]" placeholder="Buscar por ID o título..." />
                  </div>
                  <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                    <SelectTrigger className="w-36"><SelectValue placeholder="Severidad" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      <SelectItem value="critico">Crítico</SelectItem>
                      <SelectItem value="alto">Alto</SelectItem>
                      <SelectItem value="medio">Medio</SelectItem>
                      <SelectItem value="bajo">Bajo</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-36"><SelectValue placeholder="Estado" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="nuevo">Nuevo</SelectItem>
                      <SelectItem value="en_atencion">En atención</SelectItem>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="resuelto">Resuelto</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm"><Filter className="w-3.5 h-3.5" /> Más filtros</Button>
                </div>
                <div className="flex gap-2">
                  {['Todos', 'Nuevo', 'En atención', 'Pendiente', 'Resuelto', 'Cerrado'].map(s => (
                    <button key={s} className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${s === 'Todos' ? 'bg-[#001C55] text-white border-[#001C55]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>{s}</button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400">Combina: input de búsqueda + dropdowns de severidad/estado + chips de filtro rápido.</p>
              </div>
            </SubSection>
          </section>

          {/* ════════════════════ 8. FEEDBACK ════════════════════ */}
          <section>
            <SectionTitle id="feedback">8. Feedback del Sistema</SectionTitle>

            <SubSection title="Alert (shadcn/ui)" source="components/ui/alert.tsx">
              <div className="space-y-3">
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertTitle>Información</AlertTitle>
                  <AlertDescription>Tu reporte ha sido recibido. El equipo de seguridad lo revisará en breve.</AlertDescription>
                </Alert>
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>No se pudo enviar el reporte. Verifica tu conexión e intenta nuevamente.</AlertDescription>
                </Alert>
              </div>
            </SubSection>

            <SubSection title="Progress" source="components/ui/progress.tsx">
              <div className="max-w-md space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Progreso de carga</Label>
                    <span className="text-xs font-mono text-gray-500">{demoProgress}%</span>
                  </div>
                  <Progress value={demoProgress} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setDemoProgress(p => Math.max(0, p - 10))}>-10</Button>
                  <Button size="sm" variant="outline" onClick={() => setDemoProgress(p => Math.min(100, p + 10))}>+10</Button>
                  <Button size="sm" variant="outline" onClick={() => setDemoProgress(0)}>Reset</Button>
                  <Button size="sm" onClick={() => setDemoProgress(100)}>100%</Button>
                </div>
              </div>
            </SubSection>

            <SubSection title="Skeleton (Loading)" source="components/ui/skeleton.tsx">
              <div className="max-w-sm space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-20 w-full rounded-xl" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20 rounded-lg" />
                  <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
              </div>
            </SubSection>

            <SubSection title="Empty States" source="PWAMisCasos.tsx · OperadorIncidentes.tsx">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex flex-col items-center py-8 text-center bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="text-4xl mb-3">🔍</div>
                  <div className="text-sm font-semibold text-gray-600">No tienes casos registrados</div>
                  <div className="text-xs text-gray-400 mt-1">Tus reportes aparecerán aquí</div>
                </div>
                <div className="flex flex-col items-center py-8 text-center bg-[#0d1117] rounded-2xl border border-gray-800">
                  <div className="text-4xl mb-3">📭</div>
                  <div className="text-sm font-semibold text-gray-400">Sin incidentes</div>
                  <div className="text-xs text-gray-600 mt-1">Prueba con otros filtros</div>
                </div>
              </div>
            </SubSection>

            <SubSection title="Animaciones de Feedback" source="Varias páginas">
              <div className="flex gap-6 items-center flex-wrap">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-gray-500">animate-pulse</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <div className="w-4 h-4 bg-red-500 rounded-full" />
                    <div className="absolute inset-0 w-4 h-4 bg-red-500 rounded-full animate-ping" />
                  </div>
                  <span className="text-[10px] text-gray-500">animate-ping</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <button className="bg-[#001C55] text-white px-4 py-2 rounded-xl text-xs active:scale-95 transition-transform">
                    Press me
                  </button>
                  <span className="text-[10px] text-gray-500">active:scale-95</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 bg-blue-500 rounded-full relative">
                    <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-30" />
                  </div>
                  <span className="text-[10px] text-gray-500">Radar (mapa)</span>
                </div>
              </div>
            </SubSection>

            <SubSection title="Toast / Notificación Flotante" source="sonner · Varias páginas">
              <div className="space-y-3">
                <div className="flex flex-col gap-3 max-w-sm">
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900">Reporte enviado</div>
                      <div className="text-xs text-gray-500 mt-0.5">Tu incidente ha sido registrado exitosamente.</div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600 shrink-0"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="bg-white border border-red-200 rounded-xl p-4 shadow-lg flex items-start gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900">Error de conexión</div>
                      <div className="text-xs text-gray-500 mt-0.5">No se pudo enviar. Intenta nuevamente.</div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600 shrink-0"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-lg flex items-start gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                      <Info className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900">Caso escalado</div>
                      <div className="text-xs text-gray-500 mt-0.5">INC-001 ha sido enviado al supervisor.</div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600 shrink-0"><X className="w-4 h-4" /></button>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400">Posición: esquina superior derecha. Auto-dismiss en 5s. Variantes: éxito (verde), error (rojo), advertencia (ámbar).</p>
              </div>
            </SubSection>

            <SubSection title="Alerta Crítica Operacional" source="OperadorDashboard.tsx · WebDashboard.tsx">
              <div className="space-y-3">
                <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex items-start gap-3 animate-pulse">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                    <Megaphone className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">⚠ Emergencia Activa</span>
                    </div>
                    <div className="text-sm font-bold text-red-800">SOS activado — Zona Ciencias</div>
                    <div className="text-xs text-red-600 mt-1">Operador asignado: J. Sánchez · Hace 2 min</div>
                  </div>
                  <Button size="sm" variant="destructive" className="shrink-0">Responder</Button>
                </div>
                <div className="bg-[#0d1117] rounded-2xl p-4">
                  <div className="bg-red-900/20 border border-red-500/50 rounded-2xl p-4 flex items-start gap-3">
                    <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-red-400 text-[10px] font-bold uppercase tracking-wider">Crítico · INC-001</span>
                      </div>
                      <div className="text-white text-sm font-bold">Intento de robo en Estacionamiento</div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-red-300">
                        <MapPin className="w-3 h-3" /> Zona Ciencias · Hace 5 min
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400">Tema claro (web) y tema oscuro (operador). Usados para emergencias que requieren acción inmediata.</p>
              </div>
            </SubSection>

            <SubSection title="Flujo de Confirmación Interactivo" source="Varias páginas">
              <div className="max-w-xs mx-auto space-y-4">
                <div className="text-center">
                  {confirmStep === 'idle' && (
                    <div className="space-y-3">
                      <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                        <AlertTriangle className="w-8 h-8 text-amber-600" />
                      </div>
                      <div className="text-sm font-bold text-gray-900">¿Escalar incidente?</div>
                      <p className="text-xs text-gray-500">Esta acción notificará al supervisor y quedará registrada.</p>
                      <div className="flex gap-2 justify-center">
                        <Button variant="outline" size="sm" onClick={() => setConfirmStep('idle')}>Cancelar</Button>
                        <Button size="sm" onClick={() => { setConfirmStep('loading'); setTimeout(() => setConfirmStep('success'), 1500); }}>Confirmar</Button>
                      </div>
                    </div>
                  )}
                  {confirmStep === 'loading' && (
                    <div className="space-y-3 py-4">
                      <div className="w-10 h-10 border-3 border-gray-200 border-t-[#001C55] rounded-full animate-spin mx-auto" />
                      <div className="text-sm font-semibold text-gray-600">Procesando...</div>
                    </div>
                  )}
                  {confirmStep === 'success' && (
                    <div className="space-y-3">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <div className="text-sm font-bold text-green-700">¡Listo!</div>
                      <p className="text-xs text-gray-500">El incidente ha sido escalado al supervisor.</p>
                      <Button size="sm" variant="outline" onClick={() => setConfirmStep('idle')}>Volver</Button>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 text-center">Flujo: Confirmación → Loading (spinner) → Éxito. Click "Confirmar" para ver.</p>
              </div>
            </SubSection>
          </section>

          {/* ════════════════════ 9. DATA DISPLAY ════════════════════ */}
          <section>
            <SectionTitle id="data">9. Data Display</SectionTitle>

            <SubSection title="Table (shadcn/ui)" source="components/ui/table.tsx">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Severidad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Zona</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { id: 'INC-001', title: 'Intento de robo en estacionamiento', sev: 'Crítico', sevColor: 'bg-red-100 text-red-700', status: 'Nuevo', statusColor: 'bg-blue-100 text-blue-700', zone: 'Ciencias' },
                    { id: 'INC-002', title: 'Persona sospechosa en Pabellón H', sev: 'Alto', sevColor: 'bg-orange-100 text-orange-700', status: 'En atención', statusColor: 'bg-amber-100 text-amber-700', zone: 'Central' },
                    { id: 'INC-003', title: 'Robo de laptop en Biblioteca', sev: 'Alto', sevColor: 'bg-orange-100 text-orange-700', status: 'Resuelto', statusColor: 'bg-green-100 text-green-700', zone: 'Central' },
                  ].map(row => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">{row.id}</TableCell>
                      <TableCell className="font-medium">{row.title}</TableCell>
                      <TableCell><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${row.sevColor}`}>{row.sev}</span></TableCell>
                      <TableCell><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${row.statusColor}`}>{row.status}</span></TableCell>
                      <TableCell className="text-gray-500">{row.zone}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SubSection>

            <SubSection title="Accordion (shadcn/ui)" source="components/ui/accordion.tsx">
              <Accordion type="single" collapsible className="max-w-md">
                <AccordionItem value="item-1">
                  <AccordionTrigger>¿Cómo reportar un incidente?</AccordionTrigger>
                  <AccordionContent>
                    Desde la app, accede a "Reportar", selecciona el tipo de incidente, agrega una descripción y tu ubicación. El equipo de seguridad recibirá una notificación inmediata.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>¿Qué es el acompañamiento seguro?</AccordionTrigger>
                  <AccordionContent>
                    Es un servicio que permite monitorear tu recorrido dentro del campus. Si no confirmas tu llegada dentro del tiempo estimado, seguridad recibe una alerta automática.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>¿Cómo funciona el SOS?</AccordionTrigger>
                  <AccordionContent>
                    El botón SOS envía una alerta inmediata al equipo de seguridad con tu ubicación en tiempo real. Solo úsalo en emergencias reales.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </SubSection>

            <SubSection title="Avatar" source="components/ui/avatar.tsx">
              <div className="flex gap-3 items-center">
                <Avatar>
                  <AvatarFallback>MG</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback className="bg-orange-500/20 text-orange-600 font-bold text-sm">JS</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback className="bg-[#001C55] text-white font-bold text-sm">LF</AvatarFallback>
                </Avatar>
                <Avatar className="size-14">
                  <AvatarFallback className="bg-green-50 text-green-600 font-bold text-lg">AT</AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2 ml-3">
                  <div className="w-8 h-8 bg-[#25D366] rounded-full flex items-center justify-center text-white text-xs font-bold">WA</div>
                  <span className="text-[10px] text-gray-400">WhatsApp avatar custom</span>
                </div>
              </div>
            </SubSection>

            <SubSection title="ScrollArea" source="components/ui/scroll-area.tsx">
              <ScrollArea className="h-40 w-full max-w-sm rounded-xl border">
                <div className="p-4 space-y-3">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div key={i} className="flex items-center gap-3 pb-3 border-b border-gray-100 last:border-0">
                      <div className="w-2 h-2 bg-blue-400 rounded-full" />
                      <div>
                        <div className="text-sm font-medium">Evento #{i + 1}</div>
                        <div className="text-xs text-gray-400">Hace {i + 1} minutos</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </SubSection>

            <SubSection title="Timeline Vertical" source="PWAMisCasos.tsx · WebCasos.tsx">
              <div className="max-w-md">
                <div className="relative pl-6 space-y-4">
                  <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gray-200" />
                  {[
                    { time: '08:45', label: 'Incidente reportado', desc: 'Reportado por María García vía PWA', icon: AlertTriangle, color: 'bg-red-500' },
                    { time: '08:47', label: 'Asignado a operador', desc: 'J. Sánchez tomó el caso', icon: User, color: 'bg-blue-500' },
                    { time: '08:52', label: 'En atención', desc: 'Operador en camino a Zona Ciencias', icon: Clock, color: 'bg-amber-500' },
                    { time: '09:10', label: 'Nota añadida', desc: 'Se contactó a seguridad perimetral', icon: FileText, color: 'bg-gray-500' },
                    { time: '09:25', label: 'Resuelto', desc: 'Sospechoso identificado y retirado del campus', icon: CheckCircle, color: 'bg-green-500' },
                  ].map((event, i) => (
                    <div key={i} className="relative">
                      <div className={`absolute left-[-18px] w-4 h-4 rounded-full ${event.color} flex items-center justify-center`}>
                        <event.icon className="w-2.5 h-2.5 text-white" />
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-mono text-gray-400">{event.time}</span>
                          <span className="text-xs font-bold text-gray-800">{event.label}</span>
                        </div>
                        <p className="text-[11px] text-gray-500">{event.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-3">Línea vertical con dots coloreados por tipo de evento. Usado en historial de incidentes.</p>
            </SubSection>

            <SubSection title="Tabla con Filtros y Acciones" source="WebCasos.tsx · WebAdmin.tsx">
              <div className="space-y-3">
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl text-xs" placeholder="Buscar..." />
                  </div>
                  <Button variant="outline" size="sm"><Filter className="w-3.5 h-3.5" /> Filtrar</Button>
                  <Button size="sm"><Download className="w-3.5 h-3.5" /> Exportar</Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Incidente</TableHead>
                      <TableHead>Severidad</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Asignado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { id: 'INC-001', title: 'Intento de robo', sev: 'Crítico', sevCls: 'bg-red-100 text-red-700', st: 'Nuevo', stCls: 'bg-blue-100 text-blue-700', to: 'J. Sánchez', border: 'border-l-red-500' },
                      { id: 'INC-002', title: 'Persona sospechosa', sev: 'Alto', sevCls: 'bg-orange-100 text-orange-700', st: 'En atención', stCls: 'bg-amber-100 text-amber-700', to: 'M. López', border: 'border-l-orange-400' },
                      { id: 'INC-003', title: 'Robo de laptop', sev: 'Alto', sevCls: 'bg-orange-100 text-orange-700', st: 'Resuelto', stCls: 'bg-green-100 text-green-700', to: 'K. Torres', border: 'border-l-orange-400' },
                    ].map(r => (
                      <TableRow key={r.id} className={`border-l-4 ${r.border} hover:bg-blue-50/50`}>
                        <TableCell className="font-mono text-xs">{r.id}</TableCell>
                        <TableCell className="font-medium text-xs">{r.title}</TableCell>
                        <TableCell><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.sevCls}`}>{r.sev}</span></TableCell>
                        <TableCell><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.stCls}`}>{r.st}</span></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 bg-[#001C55] rounded-lg flex items-center justify-center text-white text-[9px] font-bold">{r.to.split(' ').map(n=>n[0]).join('')}</div>
                            <span className="text-xs">{r.to}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="w-3.5 h-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </SubSection>
          </section>

          {/* ════════════════════ 10. CUSTOM PWA ════════════════════ */}
          <section>
            <SectionTitle id="custom-pwa">10. Patrones Custom — PWA</SectionTitle>

            <SubSection title="Wizard de Pasos (Reportar)" source="PWAReportar.tsx">
              <div className="max-w-sm space-y-4">
                <div className="flex gap-1">
                  {[1, 2, 3].map(s => (
                    <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${s <= wizardStep ? 'bg-[#001C55]' : 'bg-gray-200'}`} />
                  ))}
                </div>
                <div className="text-center py-6 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="text-3xl mb-2">{wizardStep === 1 ? '📋' : wizardStep === 2 ? '📝' : '📍'}</div>
                  <div className="text-sm font-bold text-gray-800">
                    Paso {wizardStep}: {wizardStep === 1 ? 'Tipo de incidente' : wizardStep === 2 ? 'Detalle' : 'Ubicación'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setWizardStep(s => Math.max(1, s - 1))} disabled={wizardStep === 1}>Anterior</Button>
                  <Button size="sm" className="flex-1" onClick={() => setWizardStep(s => Math.min(3, s + 1))} disabled={wizardStep === 3}>Siguiente</Button>
                </div>
              </div>
            </SubSection>

            <SubSection title="Grid de Tipo de Incidente" source="PWAReportar.tsx">
              <div className="grid grid-cols-3 gap-2 max-w-sm">
                {[
                  { emoji: '🚨', label: 'Robo', selected: true },
                  { emoji: '🚗', label: 'Accidente', selected: false },
                  { emoji: '🔥', label: 'Incendio', selected: false },
                  { emoji: '👊', label: 'Violencia', selected: false },
                  { emoji: '🏥', label: 'Emergencia', selected: false },
                  { emoji: '💥', label: 'Vandalismo', selected: false },
                ].map(t => (
                  <div key={t.label} className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 cursor-pointer transition-all ${t.selected ? 'border-[#001C55] bg-blue-50' : 'border-gray-100 bg-gray-50 hover:border-gray-300'}`}>
                    <span className="text-2xl">{t.emoji}</span>
                    <span className={`text-xs font-semibold ${t.selected ? 'text-[#001C55]' : 'text-gray-600'}`}>{t.label}</span>
                  </div>
                ))}
              </div>
            </SubSection>

            <SubSection title="Severity Selector" source="PWAReportar.tsx">
              <div className="max-w-sm grid grid-cols-3 gap-2">
                {[
                  { label: 'Crítico', sublabel: 'Peligro inmediato', color: 'border-red-400 bg-red-50 text-red-600', selected: true },
                  { label: 'Alto', sublabel: 'Urgente', color: 'border-orange-300 bg-orange-50 text-orange-600', selected: false },
                  { label: 'Medio', sublabel: 'Importante', color: 'border-amber-300 bg-amber-50 text-amber-600', selected: false },
                ].map(s => (
                  <div key={s.label} className={`p-3 rounded-xl border-2 text-center cursor-pointer transition-all ${s.selected ? s.color : 'border-gray-200 text-gray-500'}`}>
                    <div className="text-xs font-bold">{s.label}</div>
                    <div className="text-[10px] mt-0.5">{s.sublabel}</div>
                  </div>
                ))}
              </div>
            </SubSection>

            <SubSection title="Timer Circular (Acompañamiento)" source="PWAAcompanamiento.tsx">
              <div className="flex flex-col items-center">
                <svg width="140" height="140" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r="60" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                  <circle
                    cx="80" cy="80" r="60" fill="none"
                    stroke="#001C55" strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 60}
                    strokeDashoffset={2 * Math.PI * 60 * 0.35}
                    transform="rotate(-90 80 80)"
                  />
                  <text x="80" y="78" textAnchor="middle" fill="#111" fontSize="22" fontWeight="bold">09:45</text>
                  <text x="80" y="96" textAnchor="middle" fill="#9ca3af" fontSize="10">restante</text>
                </svg>
                <p className="text-[10px] text-gray-400 mt-2">SVG circumference-based timer con strokeDasharray/offset</p>
              </div>
            </SubSection>

            <SubSection title="Phone Frame Wrapper" source="PWALayout.tsx · OperadorLayout.tsx">
              <div className="flex justify-center">
                <div className="w-[220px] bg-gray-50 rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
                  <div className="flex items-center justify-between px-4 pt-2 pb-1">
                    <span className="text-[9px] text-gray-500 font-medium">9:41</span>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-2 border border-gray-400 rounded-sm flex items-center px-0.5">
                        <div className="w-2.5 h-1 bg-green-500 rounded-sm" />
                      </div>
                    </div>
                  </div>
                  <div className="px-3 py-2 bg-white flex items-center gap-2 border-b border-gray-100">
                    <div className="w-5 h-5 bg-[#001C55] rounded-md flex items-center justify-center">
                      <Shield className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-[10px] font-bold text-[#001C55]">SafeCampus</span>
                  </div>
                  <div className="h-32 bg-gray-50 flex items-center justify-center">
                    <span className="text-[10px] text-gray-400">Contenido</span>
                  </div>
                  <div className="bg-white border-t border-gray-200 flex px-2 py-1.5">
                    {['🏠', '📝', '📋', '🔍', '👤'].map((e, i) => (
                      <div key={i} className={`flex-1 text-center text-[10px] ${i === 0 ? 'text-[#001C55]' : 'text-gray-400'}`}>{e}</div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-3">max-w-[430px] · Simula frame de dispositivo móvil para PWA y Operador</p>
            </SubSection>
          </section>

          {/* ════════════════════ 11. CUSTOM OPERATOR ════════════════════ */}
          <section>
            <SectionTitle id="custom-op">11. Patrones Custom — Operador</SectionTitle>

            <SubSection title="Quick Action Buttons" source="OperadorDashboard.tsx">
              <div className="bg-[#0d1117] rounded-2xl p-4">
                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  <button className="bg-orange-500 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.97] transition-transform">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-white font-bold text-sm">Nuevo caso</div>
                      <div className="text-orange-200 text-[10px]">Reporte rápido</div>
                    </div>
                  </button>
                  <button className="bg-[#161b22] border border-gray-700 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.97] transition-transform">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-left">
                      <div className="text-white font-bold text-sm">Ver mapa</div>
                      <div className="text-gray-500 text-[10px]">Campus en vivo</div>
                    </div>
                  </button>
                </div>
              </div>
            </SubSection>

            <SubSection title="Alert Card Crítica" source="OperadorDashboard.tsx">
              <div className="bg-[#0d1117] rounded-2xl p-4 max-w-sm">
                <div className="bg-red-900/20 border border-red-500/50 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-red-400 text-[10px] font-bold uppercase tracking-wider">⚠ Crítico · INC-001</span>
                      </div>
                      <div className="text-white text-sm font-bold">Intento de robo en Estacionamiento</div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-red-300">
                        <MapPin className="w-3 h-3" /> Zona Ciencias
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SubSection>

            <SubSection title="Status Card + Radio" source="OperadorDashboard.tsx · OperadorPerfil.tsx">
              <div className="bg-[#0d1117] rounded-2xl p-4 max-w-sm space-y-3">
                <div className="bg-[#161b22] border border-gray-800 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-500/15 rounded-xl flex items-center justify-center">
                      <Radio className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white text-xs font-bold">Canal de radio · Canal 3</div>
                      <div className="text-gray-500 text-[10px]">3 operadores activos en frecuencia</div>
                    </div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  </div>
                </div>
              </div>
            </SubSection>
          </section>

          {/* ════════════════════ 12. CUSTOM WEB ════════════════════ */}
          <section>
            <SectionTitle id="custom-web">12. Patrones Custom — Web Operativa</SectionTitle>

            <SubSection title="Sidebar Navigation" source="WebLayout.tsx">
              <div className="flex h-64">
                <div className="w-56 bg-[#001C55] rounded-xl p-4 space-y-1">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/20">
                    <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                      <Shield className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-white text-xs font-bold">SafeCampus</div>
                      <div className="text-blue-300 text-[9px]">Sistema de Seguridad</div>
                    </div>
                  </div>
                  {[
                    { icon: BarChart3, label: 'Dashboard', active: true },
                    { icon: FileText, label: 'Gestión de Casos', active: false },
                    { icon: BarChart3, label: 'KPIs y Reportes', active: false },
                    { icon: MessageCircle, label: 'Chat WhatsApp', active: false },
                    { icon: Settings, label: 'Admin Sistema', active: false },
                  ].map(item => (
                    <div
                      key={item.label}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${item.active ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white/80'}`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </div>
                  ))}
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-sm text-gray-400">← Sidebar · bg-[#001C55]</span>
                </div>
              </div>
            </SubSection>

            <SubSection title="Chat Bubble (WhatsApp)" source="WebWhatsApp.tsx">
              <div className="max-w-sm space-y-2 bg-gray-100 rounded-2xl p-4">
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md px-3 py-2 max-w-[75%]">
                    <p className="text-xs text-gray-800">Hola, quiero reportar que perdí mi carnet en la biblioteca</p>
                    <div className="text-[9px] text-gray-400 text-right mt-1">10:30 AM</div>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl rounded-tl-md px-3 py-2 max-w-[75%]">
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      <span className="text-[9px] font-bold text-blue-600">BOT</span>
                    </div>
                    <p className="text-xs text-gray-800">Entendido. ¿Puedes darme tu código de estudiante?</p>
                    <div className="text-[9px] text-gray-400 text-right mt-1">10:30 AM</div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-green-100 border border-green-200 rounded-2xl rounded-tr-md px-3 py-2 max-w-[75%]">
                    <p className="text-xs text-gray-800">Mi código es 20201234</p>
                    <div className="text-[9px] text-gray-400 text-right mt-1">10:31 AM</div>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">Burbujas: user (green), bot (blue), agent (white). Bordes redondeados asimétricos.</p>
            </SubSection>

            <SubSection title="Kanban Columns" source="WebCasos.tsx">
              <div className="flex gap-3 overflow-x-auto pb-2">
                {[
                  { label: 'Nuevo', color: 'bg-blue-500', count: 2 },
                  { label: 'En atención', color: 'bg-amber-500', count: 3 },
                  { label: 'Pendiente', color: 'bg-orange-500', count: 1 },
                  { label: 'Resuelto', color: 'bg-green-500', count: 4 },
                  { label: 'Cerrado', color: 'bg-gray-400', count: 2 },
                ].map(col => (
                  <div key={col.label} className="w-40 shrink-0 bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                      <span className="text-xs font-bold text-gray-700">{col.label}</span>
                      <span className="text-[10px] font-mono text-gray-400 ml-auto">{col.count}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="bg-white rounded-lg p-2 border border-gray-100 shadow-sm">
                        <div className="text-[10px] font-mono text-gray-400">INC-00X</div>
                        <div className="text-xs font-medium text-gray-700 line-clamp-2">Incidente de ejemplo</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SubSection>
          </section>

          {/* ════════════════════ 13. LAYOUTS ════════════════════ */}
          <section>
            <SectionTitle id="layouts">13. Layouts por Plataforma</SectionTitle>

            <SubSection title="Layout Web — Detalle" source="WebLayout.tsx">
              <div className="grid lg:grid-cols-[1.3fr_1fr] gap-4">
                <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-gray-900">Estructura Principal Web</div>
                      <div className="text-[10px] text-gray-500">Sidebar colapsable + header superior + canvas de contenido</div>
                    </div>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Desktop-first</span>
                  </div>
                  <div className="h-52 p-3 bg-white">
                    <div className="h-full rounded-xl border border-gray-200 overflow-hidden flex">
                      <div className="w-20 bg-[#001C55] p-2 space-y-1.5">
                        <div className="h-3 bg-white/20 rounded" />
                        <div className="h-2 bg-white/25 rounded" />
                        <div className="h-2 bg-white/20 rounded" />
                        <div className="h-2 bg-white/20 rounded" />
                        <div className="h-2 bg-white/20 rounded" />
                      </div>
                      <div className="flex-1 bg-gray-50">
                        <div className="h-7 border-b border-gray-200 bg-white" />
                        <div className="p-2.5 grid grid-cols-2 gap-2">
                          <div className="h-10 bg-white border border-gray-200 rounded" />
                          <div className="h-10 bg-white border border-gray-200 rounded" />
                          <div className="h-10 bg-white border border-gray-200 rounded" />
                          <div className="h-10 bg-white border border-gray-200 rounded" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                  <p className="text-xs font-bold text-gray-700">Anatomía del Layout Web</p>
                  <div className="space-y-2 text-[11px] text-gray-600">
                    <div className="rounded-lg border border-gray-200 bg-white p-2">
                      <p className="font-semibold text-gray-700">1. Sidebar lateral</p>
                      <p>Navegación principal, usuario activo, alertas críticas y colapso expandible.</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-2">
                      <p className="font-semibold text-gray-700">2. Top bar</p>
                      <p>Acceso a notificaciones, estado operacional y acciones globales.</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-2">
                      <p className="font-semibold text-gray-700">3. Área de contenido</p>
                      <p>Espacio para dashboards, tablas, filtros y vistas de gestión de casos.</p>
                    </div>
                  </div>
                </div>
              </div>
            </SubSection>

            <SubSection title="Layout PWA — Detalle" source="PWALayout.tsx">
              <div className="grid lg:grid-cols-[1.3fr_1fr] gap-4">
                <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-gray-900">Estructura Principal PWA</div>
                      <div className="text-[10px] text-gray-500">Frame móvil + header institucional + navegación inferior</div>
                    </div>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Community UX</span>
                  </div>
                  <div className="h-52 p-3 bg-gray-50 flex items-center justify-center">
                    <div className="w-32 h-48 bg-white rounded-2xl shadow border border-gray-200 overflow-hidden">
                      <div className="h-4 bg-[#001C55]" />
                      <div className="h-7 bg-[#001C55] border-b border-white/15" />
                      <div className="h-[7.25rem] p-2 space-y-1.5 bg-gray-50">
                        <div className="h-5 bg-white rounded border border-gray-100" />
                        <div className="h-5 bg-white rounded border border-gray-100" />
                        <div className="h-5 bg-white rounded border border-gray-100" />
                      </div>
                      <div className="h-9 border-t border-gray-200 bg-white grid grid-cols-5 px-1 items-center gap-1">
                        <div className="h-4 rounded bg-[#001C55]/15" />
                        <div className="h-3 rounded bg-gray-200" />
                        <div className="h-3 rounded bg-gray-200" />
                        <div className="h-3 rounded bg-gray-200" />
                        <div className="h-3 rounded bg-gray-200" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                  <p className="text-xs font-bold text-gray-700">Anatomía del Layout PWA</p>
                  <div className="space-y-2 text-[11px] text-gray-600">
                    <div className="rounded-lg border border-gray-200 bg-white p-2">
                      <p className="font-semibold text-gray-700">1. Status + header</p>
                      <p>Marca SafeCampus, cambio de rol y contexto institucional en la parte superior.</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-2">
                      <p className="font-semibold text-gray-700">2. Contenido desplazable</p>
                      <p>Zona principal para reportes, casos y formularios con espacio inferior para tabs.</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-2">
                      <p className="font-semibold text-gray-700">3. Bottom navigation</p>
                      <p>Navegación móvil de 5 secciones, optimizada para pulgar y uso frecuente.</p>
                    </div>
                  </div>
                </div>
              </div>
            </SubSection>

            <SubSection title="Layout Móvil Operador — Detalle" source="OperadorLayout.tsx">
              <div className="grid lg:grid-cols-[1.3fr_1fr] gap-4">
                <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-gray-900">Estructura Principal Operador</div>
                      <div className="text-[10px] text-gray-500">Frame móvil oscuro + estado en servicio + tabs operativas</div>
                    </div>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Field operations</span>
                  </div>
                  <div className="h-52 p-3 bg-gray-50 flex items-center justify-center">
                    <div className="w-32 h-48 bg-[#0d1117] rounded-2xl shadow border border-gray-700 overflow-hidden">
                      <div className="h-4 bg-[#0d1117] border-b border-gray-800" />
                      <div className="h-7 bg-[#0d1117] border-b border-gray-800" />
                      <div className="h-[7.25rem] p-2 space-y-1.5 bg-[#0d1117]">
                        <div className="h-5 bg-[#161b22] rounded border border-gray-700" />
                        <div className="h-5 bg-[#161b22] rounded border border-gray-700" />
                        <div className="h-5 bg-[#161b22] rounded border border-gray-700" />
                      </div>
                      <div className="h-9 border-t border-gray-700 bg-[#161b22] grid grid-cols-4 px-1 items-center gap-1">
                        <div className="h-4 rounded bg-orange-500/20" />
                        <div className="h-3 rounded bg-gray-700" />
                        <div className="h-3 rounded bg-gray-700" />
                        <div className="h-3 rounded bg-gray-700" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                  <p className="text-xs font-bold text-gray-700">Anatomía del Layout Operador</p>
                  <div className="space-y-2 text-[11px] text-gray-600">
                    <div className="rounded-lg border border-gray-200 bg-white p-2">
                      <p className="font-semibold text-gray-700">1. Header táctico</p>
                      <p>Indicadores de turno y estado operativo para monitoreo continuo en campo.</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-2">
                      <p className="font-semibold text-gray-700">2. Canvas oscuro</p>
                      <p>Contraste alto para incidentes críticos y lectura rápida en entorno operativo.</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-2">
                      <p className="font-semibold text-gray-700">3. Tabs de respuesta</p>
                      <p>Acceso inmediato a dashboard, incidentes, mapa y perfil del operador.</p>
                    </div>
                  </div>
                </div>
              </div>
            </SubSection>
          </section>

          {/* ════════════════════ 14. MÉTRICAS KPI Y SLA ════════════════════ */}
          <section>
            <SectionTitle id="kpis">14. Métricas KPI y SLA</SectionTitle>

            <SubSection title="KPI Cards — Tema Claro" source="WebDashboard.tsx · WebKPIs.tsx">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { label: 'Total Incidentes', value: '24', icon: FileText, color: 'text-blue-500 bg-blue-50', trend: '+12%', up: true },
                  { label: 'Tiempo Respuesta', value: '3.8m', icon: Clock, color: 'text-amber-500 bg-amber-50', trend: '-8%', up: false },
                  { label: 'Casos Críticos', value: '3', icon: AlertTriangle, color: 'text-red-500 bg-red-50', trend: '+2', up: true },
                  { label: 'Tasa Resolución', value: '87%', icon: CheckCircle, color: 'text-green-500 bg-green-50', trend: '+5%', up: false },
                  { label: 'SLA Cumplido', value: '94%', icon: Shield, color: 'text-purple-500 bg-purple-50', trend: '+1%', up: false },
                  { label: 'Operadores Activos', value: '8', icon: User, color: 'text-indigo-500 bg-indigo-50', trend: '0', up: false },
                ].map(k => (
                  <div key={k.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.color}`}>
                        <k.icon className="w-5 h-5" />
                      </div>
                      <span className={`text-xs font-bold flex items-center gap-0.5 ${k.up ? 'text-red-500' : 'text-green-500'}`}>
                        {k.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {k.trend}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{k.value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
                  </div>
                ))}
              </div>
            </SubSection>

            <SubSection title="KPI Cards — Tema Oscuro" source="OperadorDashboard.tsx">
              <div className="bg-[#0d1117] rounded-2xl p-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Activos', value: '5', icon: AlertTriangle, color: 'text-orange-400 bg-orange-500/15' },
                    { label: 'Resueltos hoy', value: '12', icon: CheckCircle, color: 'text-green-400 bg-green-500/15' },
                    { label: 'Tiempo prom.', value: '4.2m', icon: Clock, color: 'text-blue-400 bg-blue-500/15' },
                  ].map(k => (
                    <div key={k.label} className="bg-[#161b22] rounded-2xl p-4 border border-gray-800">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${k.color}`}>
                        <k.icon className="w-5 h-5" />
                      </div>
                      <div className="text-xl font-bold text-white">{k.value}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{k.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </SubSection>

            <SubSection title="Indicadores SLA con Progreso" source="WebKPIs.tsx">
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { label: 'First Response Time', value: '3.8 min', target: '< 5 min', pct: 92, ok: true, icon: Clock },
                  { label: 'Tiempo Medio Resolución', value: '45 min', target: '< 60 min', pct: 75, ok: true, icon: Activity },
                  { label: 'SLA Críticos', value: '88%', target: '> 95%', pct: 88, ok: false, icon: AlertTriangle },
                  { label: 'Satisfacción', value: '4.2/5', target: '> 4.0', pct: 84, ok: true, icon: Star },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <s.icon className={`w-4 h-4 ${s.ok ? 'text-green-500' : 'text-amber-500'}`} />
                      <span className="text-xs font-bold text-gray-700">{s.label}</span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-lg font-bold text-gray-900">{s.value}</span>
                      <span className="text-[10px] text-gray-400">Meta: {s.target}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${s.ok ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${s.pct}%` }} />
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1 text-right">{s.pct}%</div>
                  </div>
                ))}
              </div>
            </SubSection>

            <SubSection title="Indicadores de Tendencia Inline" source="WebDashboard.tsx">
              <div className="flex gap-4 flex-wrap">
                {[
                  { label: 'Incidentes', trend: '+12%', up: true, bad: true },
                  { label: 'Tiempo resp.', trend: '-8%', up: false, bad: false },
                  { label: 'Resolución', trend: '+5%', up: true, bad: false },
                  { label: 'Críticos', trend: '+33%', up: true, bad: true },
                  { label: 'SLA', trend: '-2%', up: false, bad: true },
                ].map(t => (
                  <div key={t.label} className="flex items-center gap-2 bg-gray-50 rounded-full px-3 py-1.5 border border-gray-100">
                    <span className="text-xs font-medium text-gray-600">{t.label}</span>
                    <span className={`text-xs font-bold flex items-center gap-0.5 ${t.bad ? 'text-red-500' : 'text-green-500'}`}>
                      {t.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {t.trend}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-2">Verde = favorable, Rojo = desfavorable. Lógica invertida según contexto (menos tiempo = mejor).</p>
            </SubSection>
          </section>

          {/* ════════════════════ 15. TIMELINES Y FLUJOS ════════════════════ */}
          <section>
            <SectionTitle id="timelines">15. Timelines y Flujos</SectionTitle>

            <SubSection title="Wizard de Pasos — Componente Completo" source="PWAReportar.tsx">
              <div className="max-w-md space-y-4">
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map(s => (
                    <div key={s} className="flex items-center flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${s <= wizardStep ? 'bg-[#001C55] text-white' : 'bg-gray-200 text-gray-500'}`}>{s}</div>
                      {s < 3 && <div className={`flex-1 h-0.5 mx-1 transition-colors ${s < wizardStep ? 'bg-[#001C55]' : 'bg-gray-200'}`} />}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 text-[10px] text-gray-500 px-1">
                  <span className="flex-1 text-center">Tipo de incidente</span>
                  <span className="flex-1 text-center">Descripción</span>
                  <span className="flex-1 text-center">Ubicación</span>
                </div>
                <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 text-center">
                  <div className="text-3xl mb-2">{wizardStep === 1 ? '📋' : wizardStep === 2 ? '📝' : '📍'}</div>
                  <div className="text-sm font-bold text-gray-800">
                    Paso {wizardStep}: {wizardStep === 1 ? 'Selecciona tipo' : wizardStep === 2 ? 'Agrega detalles' : 'Confirma ubicación'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {wizardStep === 1 ? 'Elige entre 7 categorías de incidente' : wizardStep === 2 ? 'Describe qué ocurrió, severidad y fotos' : 'Selecciona zona y punto exacto en el mapa'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setWizardStep(s => Math.max(1, s - 1))} disabled={wizardStep === 1}>Anterior</Button>
                  <Button size="sm" className="flex-1" onClick={() => setWizardStep(s => Math.min(3, s + 1))} disabled={wizardStep === 3}>
                    {wizardStep === 3 ? 'Enviar reporte' : 'Siguiente'}
                  </Button>
                </div>
              </div>
            </SubSection>

            <SubSection title="Flujo de Estado del Caso" source="mockData.ts · Todas las páginas">
              <div className="space-y-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {[
                    { label: 'Nuevo', color: 'bg-blue-500', textCl: 'text-blue-700 bg-blue-50', arrow: true },
                    { label: 'En atención', color: 'bg-amber-500', textCl: 'text-amber-700 bg-amber-50', arrow: true },
                    { label: 'Pendiente', color: 'bg-orange-500', textCl: 'text-orange-700 bg-orange-50', arrow: true },
                    { label: 'Resuelto', color: 'bg-green-500', textCl: 'text-green-700 bg-green-50', arrow: true },
                    { label: 'Cerrado', color: 'bg-gray-400', textCl: 'text-gray-600 bg-gray-100', arrow: false },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white">
                        <div className={`w-3 h-3 rounded-full ${s.color}`} />
                        <span className="text-xs font-bold text-gray-700">{s.label}</span>
                      </div>
                      {s.arrow && <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />}
                    </div>
                  ))}
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-[11px] text-gray-500">
                  <p className="font-semibold text-gray-700 mb-1">Transiciones permitidas:</p>
                  <p>Nuevo → En atención · En atención → Pendiente / Resuelto · Pendiente → En atención · Resuelto → Cerrado</p>
                </div>
              </div>
            </SubSection>

            <SubSection title="Drill-Down Maestro-Detalle" source="PWAMisCasos.tsx · OperadorIncidentes.tsx">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Vista Lista</div>
                  {[
                    { id: 'INC-001', title: 'Intento de robo', sev: 'bg-red-500', active: detailOpen },
                    { id: 'INC-002', title: 'Persona sospechosa', sev: 'bg-orange-400', active: false },
                  ].map(item => (
                    <div key={item.id} onClick={() => setDetailOpen(true)} className={`bg-white rounded-xl p-3 border cursor-pointer transition-all ${item.active ? 'border-[#001C55] shadow-md ring-1 ring-[#001C55]/20' : 'border-gray-100 hover:border-gray-300'}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${item.sev}`} />
                        <span className="text-[10px] font-mono text-gray-400">{item.id}</span>
                      </div>
                      <div className="text-xs font-semibold text-gray-800 mt-1">{item.title}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Vista Detalle</div>
                  {detailOpen ? (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-gray-900">INC-001</span>
                        <button onClick={() => setDetailOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                      </div>
                      <p className="text-xs font-semibold text-gray-700 mb-2">Intento de robo en Estacionamiento</p>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">NUEVO</span>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <div className="flex items-center justify-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full" /><span className="text-[10px] font-bold text-red-600">Crítico</span></div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 text-[10px]">Atender</Button>
                        <Button size="sm" variant="outline" className="text-[10px]">Escalar</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-8 flex flex-col items-center text-center">
                      <Eye className="w-6 h-6 text-gray-300 mb-2" />
                      <p className="text-xs text-gray-400">Selecciona un caso para ver detalle</p>
                    </div>
                  )}
                </div>
              </div>
            </SubSection>
          </section>

          {/* ════════════════════ 16. MAPA DEL CAMPUS ════════════════════ */}
          <section>
            <SectionTitle id="campus-map">16. Mapa del Campus — Vista Detallada</SectionTitle>

            <SubSection title="Mapa Georreferenciado — Tema Claro" source="WebDashboard.tsx">
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-gray-500" />
                    <span className="text-xs font-bold text-gray-700">Campus PUCP</span>
                  </div>
                  <div className="flex items-center gap-1 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-green-600">En vivo</span>
                  </div>
                </div>
                <div className="bg-gray-100 rounded-2xl overflow-hidden border border-gray-200">
                  <svg viewBox="0 0 600 380" className="w-full h-auto">
                    <defs>
                      <pattern id="grid-light" width="30" height="30" patternUnits="userSpaceOnUse">
                        <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
                      </pattern>
                    </defs>
                    <rect width="600" height="380" fill="#f8fafc" />
                    <rect width="600" height="380" fill="url(#grid-light)" />

                    {/* Green areas */}
                    <ellipse cx="300" cy="320" rx="120" ry="30" fill="#22c55e" opacity="0.15" />
                    <rect x="50" y="100" width="60" height="40" rx="8" fill="#22c55e" opacity="0.12" />
                    <rect x="480" y="80" width="70" height="50" rx="8" fill="#22c55e" opacity="0.12" />

                    {/* Roads */}
                    <rect x="0" y="175" width="600" height="12" fill="#e5e7eb" rx="2" />
                    <rect x="290" y="0" width="12" height="380" fill="#e5e7eb" rx="2" />
                    <rect x="0" y="280" width="600" height="8" fill="#e5e7eb" rx="2" />
                    <rect x="150" y="0" width="8" height="380" fill="#e5e7eb" rx="2" />
                    <rect x="440" y="0" width="8" height="380" fill="#e5e7eb" rx="2" />

                    {/* Buildings */}
                    <rect x="60" y="30" width="80" height="55" rx="6" fill="#bfdbfe" stroke="#93c5fd" strokeWidth="1" />
                    <text x="100" y="62" textAnchor="middle" fill="#1e40af" fontSize="8" fontWeight="bold">Biblioteca</text>

                    <rect x="170" y="40" width="100" height="50" rx="6" fill="#fed7aa" stroke="#fdba74" strokeWidth="1" />
                    <text x="220" y="70" textAnchor="middle" fill="#c2410c" fontSize="8" fontWeight="bold">Pabellón A</text>

                    <rect x="320" y="30" width="100" height="60" rx="6" fill="#e9d5ff" stroke="#c4b5fd" strokeWidth="1" />
                    <text x="370" y="65" textAnchor="middle" fill="#7c3aed" fontSize="8" fontWeight="bold">Pabellón H</text>

                    <rect x="60" y="200" width="80" height="60" rx="6" fill="#fef08a" stroke="#fde047" strokeWidth="1" />
                    <text x="100" y="235" textAnchor="middle" fill="#a16207" fontSize="8" fontWeight="bold">Cafetería</text>

                    <rect x="170" y="200" width="100" height="60" rx="6" fill="#fecaca" stroke="#fca5a5" strokeWidth="1" />
                    <text x="220" y="235" textAnchor="middle" fill="#dc2626" fontSize="8" fontWeight="bold">EEGGCC</text>

                    <rect x="320" y="200" width="100" height="55" rx="6" fill="#a7f3d0" stroke="#6ee7b7" strokeWidth="1" />
                    <text x="370" y="232" textAnchor="middle" fill="#059669" fontSize="8" fontWeight="bold">Canchas</text>

                    <rect x="460" y="200" width="90" height="55" rx="6" fill="#bae6fd" stroke="#7dd3fc" strokeWidth="1" />
                    <text x="505" y="232" textAnchor="middle" fill="#0284c7" fontSize="8" fontWeight="bold">Fac. Ing.</text>

                    <rect x="460" y="30" width="90" height="50" rx="6" fill="#fde68a" stroke="#fcd34d" strokeWidth="1" />
                    <text x="505" y="58" textAnchor="middle" fill="#a16207" fontSize="7" fontWeight="bold">Estacion.</text>

                    {/* Incident markers */}
                    <circle cx="500" cy="55" r="12" fill="#ef4444" opacity="0.2">
                      <animate attributeName="r" values="12;18;12" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="500" cy="55" r="8" fill="#ef4444" stroke="white" strokeWidth="2" />
                    <text x="500" y="59" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">!</text>

                    <circle cx="220" cy="230" r="7" fill="#fb923c" stroke="white" strokeWidth="2" />
                    <text x="220" y="234" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">!</text>

                    <circle cx="370" cy="55" r="7" fill="#fbbf24" stroke="white" strokeWidth="2" />

                    <circle cx="100" cy="230" r="6" fill="#22c55e" stroke="white" strokeWidth="2" />
                    <circle cx="100" cy="230" r="2" fill="white" />

                    {/* User position */}
                    <circle cx="220" cy="70" r="10" fill="#3b82f6" opacity="0.15">
                      <animate attributeName="r" values="10;16;10" dur="3s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="220" cy="70" r="5" fill="#3b82f6" stroke="white" strokeWidth="2" />
                  </svg>
                </div>
                {/* Legend */}
                <div className="flex gap-4 flex-wrap text-[10px]">
                  {[
                    { color: 'bg-red-500', label: 'Crítico' },
                    { color: 'bg-orange-400', label: 'Alto' },
                    { color: 'bg-amber-400', label: 'Medio' },
                    { color: 'bg-green-500', label: 'Bajo / Resuelto' },
                    { color: 'bg-blue-500', label: 'Mi posición' },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                      <span className="text-gray-500">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </SubSection>

            <SubSection title="Mapa Georreferenciado — Tema Oscuro" source="OperadorMapa.tsx">
              <div className="bg-[#0d1117] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {['Todos', 'Crítico', 'Alto', 'Medio', 'Bajo'].map((f, i) => (
                      <button key={f} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${i === 0 ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>{f}</button>
                    ))}
                  </div>
                  <button className="flex items-center gap-1 text-gray-400 text-[10px] border border-gray-700 px-2 py-1 rounded-lg">
                    <Layers className="w-3 h-3" /> Capas
                  </button>
                </div>
                <div className="rounded-xl overflow-hidden border border-gray-700">
                  <svg viewBox="0 0 600 340" className="w-full h-auto">
                    <defs>
                      <pattern id="grid-dark" width="30" height="30" patternUnits="userSpaceOnUse">
                        <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                      </pattern>
                    </defs>
                    <rect width="600" height="340" fill="#1a2332" />
                    <rect width="600" height="340" fill="url(#grid-dark)" />

                    {/* Green areas */}
                    <ellipse cx="300" cy="290" rx="100" ry="25" fill="#22c55e" opacity="0.08" />

                    {/* Roads */}
                    <rect x="0" y="160" width="600" height="10" fill="#1e293b" rx="2" />
                    <rect x="285" y="0" width="10" height="340" fill="#1e293b" rx="2" />

                    {/* Buildings (dark) */}
                    <rect x="60" y="30" width="80" height="50" rx="6" fill="#1e3a5f" stroke="#2563eb" strokeWidth="0.5" opacity="0.7" />
                    <text x="100" y="58" textAnchor="middle" fill="#60a5fa" fontSize="7" fontWeight="bold">Biblioteca</text>

                    <rect x="170" y="35" width="95" height="45" rx="6" fill="#3b2510" stroke="#f97316" strokeWidth="0.5" opacity="0.7" />
                    <text x="217" y="62" textAnchor="middle" fill="#fb923c" fontSize="7" fontWeight="bold">Pabellón A</text>

                    <rect x="320" y="30" width="95" height="50" rx="6" fill="#2e1a47" stroke="#8b5cf6" strokeWidth="0.5" opacity="0.7" />
                    <text x="367" y="60" textAnchor="middle" fill="#a78bfa" fontSize="7" fontWeight="bold">Pabellón H</text>

                    <rect x="60" y="190" width="80" height="50" rx="6" fill="#3b2f10" stroke="#eab308" strokeWidth="0.5" opacity="0.7" />
                    <text x="100" y="220" textAnchor="middle" fill="#fbbf24" fontSize="7" fontWeight="bold">Cafetería</text>

                    <rect x="170" y="190" width="95" height="50" rx="6" fill="#3b1520" stroke="#ef4444" strokeWidth="0.5" opacity="0.7" />
                    <text x="217" y="220" textAnchor="middle" fill="#f87171" fontSize="7" fontWeight="bold">EEGGCC</text>

                    <rect x="320" y="190" width="95" height="45" rx="6" fill="#0c3527" stroke="#22c55e" strokeWidth="0.5" opacity="0.7" />
                    <text x="367" y="217" textAnchor="middle" fill="#4ade80" fontSize="7" fontWeight="bold">Canchas</text>

                    <rect x="460" y="190" width="85" height="45" rx="6" fill="#0c2d3f" stroke="#06b6d4" strokeWidth="0.5" opacity="0.7" />
                    <text x="502" y="217" textAnchor="middle" fill="#22d3ee" fontSize="7" fontWeight="bold">Fac. Ing.</text>

                    {/* Incident markers */}
                    <circle cx="100" cy="55" r="10" fill="#ef4444" opacity="0.3">
                      <animate attributeName="r" values="10;16;10" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="100" cy="55" r="6" fill="#ef4444" stroke="#0d1117" strokeWidth="2" />

                    <circle cx="367" cy="55" r="6" fill="#fb923c" stroke="#0d1117" strokeWidth="2" />
                    <circle cx="217" cy="220" r="5" fill="#fbbf24" stroke="#0d1117" strokeWidth="2" />

                    {/* Operator position */}
                    <circle cx="217" cy="60" r="8" fill="#3b82f6" opacity="0.2">
                      <animate attributeName="r" values="8;14;8" dur="3s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="217" cy="60" r="4" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
                  </svg>
                </div>
                <div className="flex gap-3 flex-wrap text-[10px]">
                  {[
                    { color: 'bg-red-500', label: 'Crítico' },
                    { color: 'bg-orange-400', label: 'Alto' },
                    { color: 'bg-amber-400', label: 'Medio' },
                    { color: 'bg-green-500', label: 'Resuelto' },
                    { color: 'bg-blue-500', label: 'Operador' },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${l.color}`} />
                      <span className="text-gray-500">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </SubSection>

            <SubSection title="Marcadores de Incidente" source="WebDashboard.tsx · OperadorMapa.tsx">
              <div className="flex gap-6 flex-wrap items-end">
                {[
                  { label: 'Crítico', color: '#ef4444', pulse: true, icon: '!' },
                  { label: 'Alto', color: '#fb923c', pulse: false, icon: '!' },
                  { label: 'Medio', color: '#fbbf24', pulse: false, icon: '●' },
                  { label: 'Bajo', color: '#22c55e', pulse: false, icon: '✓' },
                  { label: 'Posición', color: '#3b82f6', pulse: true, icon: '◉' },
                ].map(m => (
                  <div key={m.label} className="flex flex-col items-center gap-2">
                    <svg width="50" height="50" viewBox="0 0 50 50">
                      {m.pulse && <circle cx="25" cy="25" r="12" fill={m.color} opacity="0.2"><animate attributeName="r" values="12;18;12" dur="2s" repeatCount="indefinite" /></circle>}
                      <circle cx="25" cy="25" r="8" fill={m.color} stroke="white" strokeWidth="2" />
                      <text x="25" y="29" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">{m.icon}</text>
                    </svg>
                    <span className="text-[10px] text-gray-500">{m.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-3">Críticos y posición usan animate-pulse (anillo expansivo). Todos tienen stroke blanco para contraste.</p>
            </SubSection>

            <SubSection title="Mapa SVG de Ruta (Acompañamiento)" source="PWAAcompanamiento.tsx">
              <div className="max-w-md mx-auto bg-gray-50 rounded-2xl border border-gray-100 p-4">
                <svg viewBox="0 0 300 100" className="w-full h-auto">
                  <rect width="300" height="100" fill="#f0fdf4" rx="8" />
                  <rect x="20" y="30" width="40" height="25" rx="4" fill="#bfdbfe" stroke="#93c5fd" strokeWidth="0.5" />
                  <text x="40" y="46" textAnchor="middle" fill="#2563eb" fontSize="6">Origen</text>
                  <rect x="240" y="30" width="40" height="25" rx="4" fill="#bbf7d0" stroke="#86efac" strokeWidth="0.5" />
                  <text x="260" y="46" textAnchor="middle" fill="#16a34a" fontSize="6">Destino</text>
                  <path d="M 60 42 Q 100 20 150 42 Q 200 65 240 42" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="4 2" />
                  <circle cx="130" cy="35" r="4" fill="#3b82f6" stroke="white" strokeWidth="1.5">
                    <animate attributeName="cx" values="60;240" dur="6s" repeatCount="indefinite" />
                    <animate attributeName="cy" values="42;30;42;55;42" dur="6s" repeatCount="indefinite" />
                  </circle>
                </svg>
                <p className="text-[10px] text-gray-400 text-center mt-2">Punto azul animado recorriendo la ruta. Usado en la función de acompañamiento seguro.</p>
              </div>
            </SubSection>
          </section>

          {/* ════════════════════ 17. GRÁFICOS ════════════════════ */}
          <section>
            <SectionTitle id="charts">17. Gráficos y Visualizaciones</SectionTitle>

            <SubSection title="Gráfico de Líneas — Tendencia Mensual" source="WebKPIs.tsx">
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-bold text-gray-800">Incidentes por Mes</div>
                  <div className="flex gap-3 text-[10px]">
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#001C55] rounded" /> Total</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-500 rounded" /> Resueltos</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-500 rounded" /> Críticos</span>
                  </div>
                </div>
                <svg viewBox="0 0 400 160" className="w-full h-auto">
                  {/* Grid */}
                  {[0, 1, 2, 3, 4].map(i => (
                    <line key={i} x1="40" y1={20 + i * 30} x2="380" y2={20 + i * 30} stroke="#f3f4f6" strokeWidth="1" />
                  ))}
                  {/* Y labels */}
                  {['40', '30', '20', '10', '0'].map((v, i) => (
                    <text key={v} x="30" y={24 + i * 30} textAnchor="end" fill="#9ca3af" fontSize="8">{v}</text>
                  ))}
                  {/* X labels */}
                  {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'].map((m, i) => (
                    <text key={m} x={68 + i * 60} y={155} textAnchor="middle" fill="#9ca3af" fontSize="8">{m}</text>
                  ))}
                  {/* Total line */}
                  <polyline points="68,80 128,65 188,50 248,38 308,55 368,45" fill="none" stroke="#001C55" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  {/* Resueltos line */}
                  <polyline points="68,95 128,82 188,68 248,55 308,70 368,58" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  {/* Críticos line */}
                  <polyline points="68,120 128,110 188,115 248,105 308,112 368,108" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2" />
                  {/* Dots */}
                  {[68, 128, 188, 248, 308, 368].map(x => (
                    <circle key={x} cx={x} cy={[80,65,50,38,55,45][[68,128,188,248,308,368].indexOf(x)]} r="3" fill="#001C55" stroke="white" strokeWidth="1.5" />
                  ))}
                </svg>
              </div>
            </SubSection>

            <SubSection title="Gráfico Donut — Distribución por Tipo" source="WebKPIs.tsx">
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="text-sm font-bold text-gray-800 mb-4">Incidentes por Tipo</div>
                <div className="flex items-center gap-6">
                  <svg width="160" height="160" viewBox="0 0 160 160">
                    {/* Donut segments */}
                    <circle cx="80" cy="80" r="55" fill="none" stroke="#ef4444" strokeWidth="20" strokeDasharray="86.4 259.2" strokeDashoffset="0" transform="rotate(-90 80 80)" />
                    <circle cx="80" cy="80" r="55" fill="none" stroke="#3b82f6" strokeWidth="20" strokeDasharray="69.1 276.5" strokeDashoffset="-86.4" transform="rotate(-90 80 80)" />
                    <circle cx="80" cy="80" r="55" fill="none" stroke="#f97316" strokeWidth="20" strokeDasharray="51.8 293.7" strokeDashoffset="-155.5" transform="rotate(-90 80 80)" />
                    <circle cx="80" cy="80" r="55" fill="none" stroke="#eab308" strokeWidth="20" strokeDasharray="34.6 311" strokeDashoffset="-207.3" transform="rotate(-90 80 80)" />
                    <circle cx="80" cy="80" r="55" fill="none" stroke="#8b5cf6" strokeWidth="20" strokeDasharray="34.6 311" strokeDashoffset="-241.9" transform="rotate(-90 80 80)" />
                    <circle cx="80" cy="80" r="55" fill="none" stroke="#6b7280" strokeWidth="20" strokeDasharray="69.1 276.5" strokeDashoffset="-276.5" transform="rotate(-90 80 80)" />
                    {/* Center */}
                    <circle cx="80" cy="80" r="40" fill="white" />
                    <text x="80" y="76" textAnchor="middle" fill="#111" fontSize="16" fontWeight="bold">24</text>
                    <text x="80" y="90" textAnchor="middle" fill="#9ca3af" fontSize="8">Total</text>
                  </svg>
                  <div className="space-y-2 text-xs">
                    {[
                      { color: 'bg-red-500', label: 'Robo', pct: '25%' },
                      { color: 'bg-blue-500', label: 'Sospechoso', pct: '20%' },
                      { color: 'bg-orange-500', label: 'Accidente', pct: '15%' },
                      { color: 'bg-yellow-500', label: 'Vandalismo', pct: '10%' },
                      { color: 'bg-purple-500', label: 'Emergencia', pct: '10%' },
                      { color: 'bg-gray-500', label: 'Otros', pct: '20%' },
                    ].map(t => (
                      <div key={t.label} className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                        <span className="text-gray-600 w-20">{t.label}</span>
                        <span className="font-bold text-gray-800">{t.pct}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SubSection>

            <SubSection title="Gráfico de Barras Horizontal — Por Zona" source="WebKPIs.tsx">
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="text-sm font-bold text-gray-800 mb-4">Incidentes por Zona</div>
                <div className="space-y-3">
                  {[
                    { zone: 'Zona Ciencias', count: 8, pct: 100, color: 'bg-red-500' },
                    { zone: 'Zona Central', count: 6, pct: 75, color: 'bg-[#001C55]' },
                    { zone: 'Zona Letras', count: 4, pct: 50, color: 'bg-[#001C55]/80' },
                    { zone: 'Zona Deportiva', count: 3, pct: 37, color: 'bg-[#001C55]/60' },
                    { zone: 'Estacionamiento', count: 3, pct: 37, color: 'bg-[#001C55]/40' },
                  ].map(z => (
                    <div key={z.zone} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-28 shrink-0">{z.zone}</span>
                      <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden">
                        <div className={`h-full ${z.color} rounded-lg flex items-center justify-end pr-2 transition-all`} style={{ width: `${z.pct}%` }}>
                          <span className="text-[10px] font-bold text-white">{z.count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SubSection>
          </section>

          {/* ════════════════════ 18. INDICADORES ESPECIALIZADOS ════════════════════ */}
          <section>
            <SectionTitle id="indicators">18. Indicadores Especializados</SectionTitle>

            <SubSection title="Sistema de Severidad Completo" source="mockData.ts · severityConfig">
              <div className="grid sm:grid-cols-4 gap-3">
                {[
                  { level: 'Crítico', color: 'bg-red-500', bgLight: 'bg-red-50 border-red-200', bgDark: 'bg-red-500/20 border-red-500/50', text: 'text-red-700', textDark: 'text-red-400', icon: AlertTriangle, desc: 'Peligro inmediato para personas', pulse: true },
                  { level: 'Alto', color: 'bg-orange-400', bgLight: 'bg-orange-50 border-orange-200', bgDark: 'bg-orange-500/20 border-orange-500/50', text: 'text-orange-700', textDark: 'text-orange-400', icon: AlertTriangle, desc: 'Requiere respuesta urgente', pulse: false },
                  { level: 'Medio', color: 'bg-amber-400', bgLight: 'bg-amber-50 border-amber-200', bgDark: 'bg-amber-500/20 border-amber-500/50', text: 'text-amber-700', textDark: 'text-amber-400', icon: Info, desc: 'Seguimiento prioritario', pulse: false },
                  { level: 'Bajo', color: 'bg-green-500', bgLight: 'bg-green-50 border-green-200', bgDark: 'bg-green-500/20 border-green-500/50', text: 'text-green-700', textDark: 'text-green-400', icon: CheckCircle, desc: 'Para registro y análisis', pulse: false },
                ].map(s => (
                  <div key={s.level} className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className={`h-2 ${s.color}`} />
                    <div className="p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${s.color} ${s.pulse ? 'animate-pulse' : ''}`} />
                        <span className="text-xs font-bold text-gray-800">{s.level}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${s.bgLight} ${s.text}`}>{s.level}</span>
                      </div>
                      <div className="bg-[#0d1117] rounded-lg p-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${s.bgDark} ${s.textDark}`}>{s.level}</span>
                      </div>
                      <p className="text-[10px] text-gray-500">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SubSection>

            <SubSection title="Badges de Estado del Caso" source="mockData.ts · statusBadgeColor">
              <div className="space-y-3">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tema Claro</div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: 'NUEVO', cls: 'bg-blue-100 text-blue-700', icon: AlertTriangle },
                    { label: 'EN ATENCIÓN', cls: 'bg-amber-100 text-amber-700', icon: Clock },
                    { label: 'PENDIENTE', cls: 'bg-orange-100 text-orange-700', icon: Clock },
                    { label: 'RESUELTO', cls: 'bg-green-100 text-green-700', icon: CheckCircle },
                    { label: 'CERRADO', cls: 'bg-gray-100 text-gray-600', icon: CheckCircle },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${s.cls} flex items-center gap-1`}>
                        <s.icon className="w-3 h-3" />
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tema Oscuro</div>
                <div className="bg-[#0d1117] rounded-xl p-3 flex gap-2 flex-wrap">
                  {[
                    { label: 'NUEVO', cls: 'bg-blue-500/20 text-blue-400' },
                    { label: 'EN ATENCIÓN', cls: 'bg-amber-500/20 text-amber-400' },
                    { label: 'PENDIENTE', cls: 'bg-orange-500/20 text-orange-400' },
                    { label: 'RESUELTO', cls: 'bg-green-500/20 text-green-400' },
                    { label: 'CERRADO', cls: 'bg-gray-500/20 text-gray-400' },
                  ].map(s => (
                    <span key={s.label} className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                  ))}
                </div>
              </div>
            </SubSection>

            <SubSection title="Notificaciones Visuales" source="PWAPerfil.tsx · WebLayout.tsx">
              <div className="space-y-3">
                <div className="max-w-sm space-y-2">
                  {[
                    { type: 'Incidente asignado', icon: AlertTriangle, color: 'bg-red-100 text-red-600', time: 'Hace 5 min', unread: true },
                    { type: 'Caso resuelto', icon: CheckCircle, color: 'bg-green-100 text-green-600', time: 'Hace 20 min', unread: true },
                    { type: 'Actualización sistema', icon: Info, color: 'bg-blue-100 text-blue-600', time: 'Hace 1 hora', unread: false },
                    { type: 'SOS activado', icon: Megaphone, color: 'bg-red-100 text-red-600', time: 'Hace 3 horas', unread: false },
                  ].map((n, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${n.unread ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-gray-100'}`}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${n.color}`}>
                        <n.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-800">{n.type}</div>
                        <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {n.time}
                        </div>
                      </div>
                      {n.unread && <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1" />}
                    </div>
                  ))}
                </div>
              </div>
            </SubSection>

            <SubSection title="Indicadores en Tiempo Real" source="OperadorDashboard.tsx · WebDashboard.tsx">
              <div className="flex gap-6 flex-wrap items-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-40" />
                  </div>
                  <span className="text-[10px] text-gray-500">En servicio</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-1 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-green-600">En vivo</span>
                  </div>
                  <span className="text-[10px] text-gray-500">Live badge</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-1 bg-red-50 border border-red-200 px-2.5 py-1 rounded-xl">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs font-semibold text-red-600">2 críticos</span>
                  </div>
                  <span className="text-[10px] text-gray-500">Alert counter</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <Bell className="w-5 h-5 text-gray-500" />
                    <span className="absolute -top-1 -right-1 text-[8px] font-bold text-white bg-red-500 w-4 h-4 rounded-full flex items-center justify-center">5</span>
                  </div>
                  <span className="text-[10px] text-gray-500">Notif. badge</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 border-3 border-gray-200 border-t-[#001C55] rounded-full animate-spin" />
                  <span className="text-[10px] text-gray-500">Loading</span>
                </div>
              </div>
            </SubSection>
          </section>

          {/* ════════════════════ 19. PATRONES DE INTERACCIÓN ════════════════════ */}
          <section>
            <SectionTitle id="interaction">19. Patrones de Interacción</SectionTitle>

            <SubSection title="Navegación Web — Sidebar + Active State" source="WebLayout.tsx">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sidebar expandido</div>
                  <div className="bg-[#001C55] rounded-xl p-2 space-y-1 w-56">
                    {[
                      { label: 'Dashboard', active: true },
                      { label: 'Gestión de Casos', active: false },
                      { label: 'KPIs y Reportes', active: false },
                    ].map(item => (
                      <div key={item.label} className={`px-3 py-2 rounded-xl text-xs font-medium ${item.active ? 'bg-white/15 text-white' : 'text-blue-200'}`}>{item.label}</div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sidebar colapsado</div>
                  <div className="bg-[#001C55] rounded-xl p-2 space-y-1 w-14">
                    {[
                      { icon: BarChart3, active: true },
                      { icon: FileText, active: false },
                      { icon: Settings, active: false },
                    ].map((item, i) => (
                      <div key={i} className={`p-2 rounded-xl flex justify-center ${item.active ? 'bg-white/15' : ''}`}>
                        <item.icon className={`w-5 h-5 ${item.active ? 'text-white' : 'text-blue-300'}`} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">Activo: <CodeLabel>bg-white/15 text-white</CodeLabel>. Transición suave entre estados.</p>
            </SubSection>

            <SubSection title="Navegación Móvil — Bottom Tabs + Active Rules" source="PWALayout.tsx · OperadorLayout.tsx">
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">PWA (Tema Claro)</div>
                  <div className="max-w-[430px] bg-white rounded-xl border border-gray-200 flex">
                    {[
                      { icon: Shield, label: 'Inicio', active: true },
                      { icon: AlertTriangle, label: 'Reportar', active: false },
                      { icon: FileText, label: 'Mis casos', active: false },
                      { icon: Search, label: 'Lost & Found', active: false },
                      { icon: User, label: 'Perfil', active: false },
                    ].map(item => (
                      <div key={item.label} className={`flex-1 flex flex-col items-center py-2 gap-0.5 ${item.active ? 'text-[#001C55]' : 'text-gray-400'}`}>
                        <div className={`p-1.5 rounded-xl ${item.active ? 'bg-blue-50' : ''}`}><item.icon className="w-4 h-4" /></div>
                        <span className="text-[9px] font-medium">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Operador (Tema Oscuro)</div>
                  <div className="max-w-[430px] bg-[#161b22] rounded-xl border border-gray-700 flex">
                    {[
                      { icon: BarChart3, label: 'Dashboard', active: true },
                      { icon: FileText, label: 'Incidentes', active: false },
                      { icon: MapPin, label: 'Mapa', active: false },
                      { icon: User, label: 'Perfil', active: false },
                    ].map(item => (
                      <div key={item.label} className={`flex-1 flex flex-col items-center py-2 gap-0.5 ${item.active ? 'text-orange-400' : 'text-gray-600'}`}>
                        <div className={`p-1.5 rounded-xl ${item.active ? 'bg-orange-500/15' : ''}`}><item.icon className="w-4 h-4" /></div>
                        <span className="text-[9px] font-medium">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SubSection>

            <SubSection title="Grid de Selección de Tipo" source="PWAReportar.tsx">
              <div className="grid grid-cols-4 gap-2 max-w-md">
                {[
                  { emoji: '🚨', label: 'Robo', selected: true },
                  { emoji: '🚗', label: 'Accidente', selected: false },
                  { emoji: '🔥', label: 'Incendio', selected: false },
                  { emoji: '👊', label: 'Violencia', selected: false },
                  { emoji: '🏥', label: 'Emergencia', selected: false },
                  { emoji: '💥', label: 'Vandalismo', selected: false },
                  { emoji: '👤', label: 'Sospechoso', selected: false },
                  { emoji: '❓', label: 'Otro', selected: false },
                ].map(t => (
                  <div key={t.label} className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 cursor-pointer transition-all ${t.selected ? 'border-[#001C55] bg-blue-50' : 'border-gray-100 bg-gray-50 hover:border-gray-300'}`}>
                    <span className="text-xl">{t.emoji}</span>
                    <span className={`text-[10px] font-semibold ${t.selected ? 'text-[#001C55]' : 'text-gray-600'}`}>{t.label}</span>
                  </div>
                ))}
              </div>
            </SubSection>

            <SubSection title="Paneles de Acción" source="OperadorDashboard.tsx · WebCasos.tsx">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Acciones (Tema Claro)</div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                    <Button className="w-full justify-start gap-2" size="sm"><Edit className="w-4 h-4" /> Editar incidente</Button>
                    <Button variant="outline" className="w-full justify-start gap-2" size="sm"><User className="w-4 h-4" /> Reasignar operador</Button>
                    <Button variant="outline" className="w-full justify-start gap-2" size="sm"><TrendingUp className="w-4 h-4" /> Escalar a supervisor</Button>
                    <Button variant="destructive" className="w-full justify-start gap-2" size="sm"><X className="w-4 h-4" /> Cerrar caso</Button>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Acciones (Tema Oscuro)</div>
                  <div className="bg-[#0d1117] rounded-xl border border-gray-800 p-4 space-y-2">
                    <button className="w-full text-left bg-orange-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2"><Zap className="w-4 h-4" /> Registrar nota</button>
                    <button className="w-full text-left bg-[#161b22] text-gray-300 border border-gray-700 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2"><User className="w-4 h-4" /> Transferir</button>
                    <button className="w-full text-left bg-green-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Marcar resuelto</button>
                  </div>
                </div>
              </div>
            </SubSection>

            <SubSection title="Vista Kanban" source="WebCasos.tsx">
              <div className="flex gap-3 overflow-x-auto pb-2">
                {[
                  { label: 'Nuevo', color: 'bg-blue-500', items: ['Intento de robo', 'Objeto sospechoso'] },
                  { label: 'En atención', color: 'bg-amber-500', items: ['Persona sospechosa', 'Ruido excesivo', 'Vidrio roto'] },
                  { label: 'Pendiente', color: 'bg-orange-500', items: ['Robo de laptop'] },
                  { label: 'Resuelto', color: 'bg-green-500', items: ['Altercado verbal', 'Accidente menor', 'Vandalismo'] },
                ].map(col => (
                  <div key={col.label} className="w-44 shrink-0 bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                      <span className="text-xs font-bold text-gray-700">{col.label}</span>
                      <span className="text-[10px] font-mono text-gray-400 ml-auto">{col.items.length}</span>
                    </div>
                    <div className="space-y-2">
                      {col.items.map(item => (
                        <div key={item} className="bg-white rounded-lg p-2 border border-gray-100 shadow-sm">
                          <div className="text-xs font-medium text-gray-700 line-clamp-2">{item}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SubSection>
          </section>

          {/* ════════════════════ 20. PANTALLAS DEL SISTEMA ════════════════════ */}
          <section>
            <SectionTitle id="screens">20. Pantallas del Sistema</SectionTitle>

            <SubSection title="Pantalla de Acceso (Login)" source="Login.tsx">
              <div className="grid sm:grid-cols-[1.2fr_1fr] gap-4">
                <div className="rounded-2xl overflow-hidden border border-gray-200 h-64">
                  <div className="h-full flex">
                    <div className="w-1/2 bg-gradient-to-br from-[#001C55] to-[#003087] p-4 flex flex-col justify-center items-center text-center">
                      <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center mb-2">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-white font-bold text-sm">SafeCampus</div>
                      <div className="text-blue-200 text-[9px] mt-1">Plataforma de Seguridad</div>
                    </div>
                    <div className="w-1/2 bg-white p-4 flex flex-col justify-center">
                      <div className="text-xs font-bold text-gray-800 mb-3">Iniciar Sesión</div>
                      <div className="space-y-2">
                        <div className="h-7 bg-gray-100 rounded-lg border border-gray-200" />
                        <div className="h-7 bg-gray-100 rounded-lg border border-gray-200" />
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { label: 'Comunidad', color: 'border-blue-400 bg-blue-50' },
                            { label: 'Operador', color: 'border-orange-400 bg-orange-50' },
                            { label: 'Supervisor', color: 'border-[#001C55] bg-blue-50' },
                            { label: 'Admin', color: 'border-purple-400 bg-purple-50' },
                          ].map(r => (
                            <div key={r.label} className={`border rounded-md px-1.5 py-1 text-center text-[8px] font-semibold text-gray-600 ${r.color}`}>{r.label}</div>
                          ))}
                        </div>
                        <div className="h-7 bg-[#001C55] rounded-lg" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-gray-500 space-y-1.5">
                  <p className="font-bold text-gray-700">Componentes clave:</p>
                  <p>• Panel dividido: branding izquierda + formulario derecha</p>
                  <p>• Selección de rol con 4 opciones (colores por rol)</p>
                  <p>• Auto-fill de credenciales demo según rol</p>
                  <p>• Estado de carga con spinner animado</p>
                  <p>• Responsive: panel izquierdo oculto en móvil</p>
                </div>
              </div>
            </SubSection>

            <SubSection title="PWA — Comunidad" source="PWAHome.tsx · PWAReportar.tsx · PWAMisCasos.tsx">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b text-[10px] font-bold text-gray-600">Home</div>
                  <div className="h-52 p-2 bg-white space-y-1.5">
                    <div className="h-10 bg-gradient-to-r from-[#001C55] to-[#003087] rounded-xl" />
                    <div className="grid grid-cols-4 gap-1">
                      {['🚨', '🛡', '📦', '🔔'].map(e => <div key={e} className="h-8 bg-gray-50 rounded-lg flex items-center justify-center text-sm">{e}</div>)}
                    </div>
                    <div className="h-8 bg-red-500 rounded-xl" />
                    <div className="h-6 bg-amber-50 border border-amber-200 rounded-lg" />
                    <div className="h-10 bg-gray-50 rounded-xl border border-gray-100" />
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b text-[10px] font-bold text-gray-600">Reportar (3 pasos)</div>
                  <div className="h-52 p-2 bg-white space-y-1.5">
                    <div className="flex gap-1">{[1,2,3].map(s => <div key={s} className={`flex-1 h-1 rounded-full ${s === 1 ? 'bg-[#001C55]' : 'bg-gray-200'}`} />)}</div>
                    <div className="grid grid-cols-2 gap-1">
                      {['🚨', '🚗', '🔥', '👊', '🏥', '💥'].map(e => <div key={e} className="h-7 bg-gray-50 rounded-lg flex items-center justify-center text-xs border border-gray-100">{e}</div>)}
                    </div>
                    <div className="h-7 bg-[#001C55] rounded-lg" />
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b text-[10px] font-bold text-gray-600">Mis Casos (Detalle)</div>
                  <div className="h-52 p-2 bg-white space-y-1.5">
                    <div className="h-6 border-l-4 border-l-red-500 bg-gray-50 rounded-r-lg" />
                    <div className="h-6 border-l-4 border-l-orange-400 bg-gray-50 rounded-r-lg" />
                    <div className="h-6 border-l-4 border-l-green-500 bg-gray-50 rounded-r-lg" />
                    <div className="h-16 bg-gray-50 rounded-xl border border-gray-100 p-1.5">
                      <div className="text-[8px] text-gray-400">Timeline de historial</div>
                      <div className="flex gap-1 mt-1">
                        {[1,2,3,4].map(i => <div key={i} className="w-2 h-2 rounded-full bg-[#001C55]" />)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SubSection>

            <SubSection title="Web Operativa" source="WebDashboard.tsx · WebCasos.tsx · WebKPIs.tsx">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b text-[10px] font-bold text-gray-600">Dashboard</div>
                  <div className="h-48 flex">
                    <div className="w-8 bg-[#001C55]" />
                    <div className="flex-1 p-1.5 bg-gray-50 space-y-1">
                      <div className="h-4 bg-white border border-gray-200 rounded" />
                      <div className="grid grid-cols-3 gap-1">{[1,2,3].map(i => <div key={i} className="h-6 bg-white border border-gray-100 rounded" />)}</div>
                      <div className="grid grid-cols-[2fr_1fr] gap-1">
                        <div className="h-16 bg-green-50 border border-green-100 rounded text-[7px] text-center pt-1 text-green-600">Mapa</div>
                        <div className="h-16 bg-white border border-gray-100 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b text-[10px] font-bold text-gray-600">Gestión Casos</div>
                  <div className="h-48 flex">
                    <div className="w-8 bg-[#001C55]" />
                    <div className="flex-1 p-1.5 bg-gray-50 space-y-1">
                      <div className="h-4 bg-white border border-gray-200 rounded" />
                      <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <div key={i} className="flex-1 space-y-0.5"><div className="h-2 rounded bg-white border border-gray-100" /><div className="h-5 bg-white border border-gray-100 rounded" /><div className="h-5 bg-white border border-gray-100 rounded" /></div>)}</div>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b text-[10px] font-bold text-gray-600">KPIs</div>
                  <div className="h-48 flex">
                    <div className="w-8 bg-[#001C55]" />
                    <div className="flex-1 p-1.5 bg-gray-50 space-y-1">
                      <div className="grid grid-cols-3 gap-1">{[1,2,3].map(i => <div key={i} className="h-5 bg-white border border-gray-100 rounded" />)}</div>
                      <div className="h-12 bg-white border border-gray-100 rounded" />
                      <div className="grid grid-cols-2 gap-1">
                        <div className="h-10 bg-white border border-gray-100 rounded" />
                        <div className="h-10 bg-white border border-gray-100 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SubSection>

            <SubSection title="Móvil Operador" source="OperadorDashboard.tsx · OperadorIncidentes.tsx · OperadorMapa.tsx">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-gray-700 overflow-hidden bg-[#0d1117]">
                  <div className="px-3 py-2 border-b border-gray-800 text-[10px] font-bold text-gray-400">Dashboard</div>
                  <div className="h-48 p-2 space-y-1.5">
                    <div className="h-8 bg-[#161b22] rounded-lg border border-gray-800" />
                    <div className="grid grid-cols-3 gap-1">{[1,2,3].map(i => <div key={i} className="h-6 bg-[#161b22] border border-gray-800 rounded-lg" />)}</div>
                    <div className="h-6 bg-red-900/20 border border-red-500/30 rounded-lg" />
                    <div className="grid grid-cols-2 gap-1">{[1,2].map(i => <div key={i} className="h-8 bg-[#161b22] border border-gray-800 rounded-lg" />)}</div>
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-700 overflow-hidden bg-[#0d1117]">
                  <div className="px-3 py-2 border-b border-gray-800 text-[10px] font-bold text-gray-400">Incidentes</div>
                  <div className="h-48 p-2 space-y-1.5">
                    <div className="h-5 bg-[#161b22] rounded-lg border border-gray-800" />
                    <div className="flex gap-1">{['T', 'N', 'A', 'P', 'R'].map(l => <div key={l} className="flex-1 h-4 bg-[#161b22] border border-gray-800 rounded text-[7px] text-gray-500 flex items-center justify-center">{l}</div>)}</div>
                    {[1,2,3].map(i => <div key={i} className="h-8 bg-[#161b22] border-l-2 border-l-red-500 border border-gray-800 rounded-r-lg" />)}
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-700 overflow-hidden bg-[#0d1117]">
                  <div className="px-3 py-2 border-b border-gray-800 text-[10px] font-bold text-gray-400">Mapa</div>
                  <div className="h-48 p-2">
                    <div className="h-full bg-[#1a2332] rounded-xl border border-gray-700 flex items-center justify-center">
                      <div className="text-center">
                        <MapPin className="w-6 h-6 text-orange-400 mx-auto mb-1" />
                        <span className="text-[8px] text-gray-500">Mapa SVG interactivo</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SubSection>

            <SubSection title="Lost & Found" source="PWALostFound.tsx">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b text-[10px] font-bold text-gray-600">Lista de Objetos</div>
                  <div className="h-44 p-2 bg-white space-y-1.5">
                    <div className="h-5 bg-gray-100 rounded-lg" />
                    <div className="flex gap-1">{['Todo', 'Perdido', 'Encontrado'].map(l => <div key={l} className={`flex-1 h-4 rounded text-[8px] text-center py-0.5 ${l === 'Todo' ? 'bg-[#001C55] text-white' : 'bg-gray-100 text-gray-500'}`}>{l}</div>)}</div>
                    {[1,2,3].map(i => (
                      <div key={i} className="flex gap-2 p-1.5 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="w-6 h-6 bg-gray-200 rounded-lg shrink-0" />
                        <div className="flex-1 space-y-0.5">
                          <div className="h-2 bg-gray-200 rounded w-3/4" />
                          <div className="h-1.5 bg-gray-100 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b text-[10px] font-bold text-gray-600">Formulario Reporte</div>
                  <div className="h-44 p-2 bg-white space-y-1.5">
                    <div className="flex gap-1">
                      <div className="flex-1 h-6 bg-red-50 border border-red-200 rounded text-[8px] flex items-center justify-center text-red-600">🔴 Perdido</div>
                      <div className="flex-1 h-6 bg-gray-50 border border-gray-200 rounded text-[8px] flex items-center justify-center">🟢 Encontrado</div>
                    </div>
                    <div className="h-5 bg-gray-100 rounded border border-gray-200" />
                    <div className="h-10 bg-gray-100 rounded border border-gray-200" />
                    <div className="h-8 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-[8px] text-gray-400">📷 Subir foto</div>
                    <div className="h-6 bg-red-500 rounded-lg" />
                  </div>
                </div>
              </div>
            </SubSection>

            <SubSection title="Acompañamiento Seguro" source="PWAAcompanamiento.tsx">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b text-[10px] font-bold text-gray-600">Inicio</div>
                  <div className="h-44 p-2 bg-white space-y-1.5">
                    <div className="h-16 bg-gradient-to-br from-[#001C55] to-[#003087] rounded-xl flex items-center justify-center">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div className="grid grid-cols-3 gap-1">{[1,2,3].map(i => <div key={i} className="h-5 bg-blue-50 border border-blue-100 rounded" />)}</div>
                    <div className="h-8 bg-[#001C55] rounded-xl" />
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b text-[10px] font-bold text-gray-600">En Ruta</div>
                  <div className="h-44 p-2 bg-white flex flex-col items-center justify-center gap-2">
                    <svg width="80" height="80" viewBox="0 0 160 160">
                      <circle cx="80" cy="80" r="55" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                      <circle cx="80" cy="80" r="55" fill="none" stroke="#001C55" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${2*Math.PI*55*0.65} ${2*Math.PI*55*0.35}`} transform="rotate(-90 80 80)" />
                      <text x="80" y="78" textAnchor="middle" fill="#111" fontSize="18" fontWeight="bold">09:45</text>
                      <text x="80" y="94" textAnchor="middle" fill="#9ca3af" fontSize="9">restante</text>
                    </svg>
                    <div className="flex gap-1 w-full">
                      <div className="flex-1 h-5 bg-red-500 rounded text-[7px] text-white flex items-center justify-center">SOS</div>
                      <div className="flex-1 h-5 bg-green-500 rounded text-[7px] text-white flex items-center justify-center">Llegué</div>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b text-[10px] font-bold text-gray-600">Alerta</div>
                  <div className="h-44 p-2 bg-white flex flex-col items-center justify-center gap-2">
                    <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center animate-pulse">
                      <AlertTriangle className="w-7 h-7 text-red-500" />
                    </div>
                    <div className="text-xs font-bold text-red-600">¡Alerta enviada!</div>
                    <div className="w-full h-5 bg-red-500 rounded text-[7px] text-white flex items-center justify-center">Llamar emergencias</div>
                    <div className="w-full h-5 bg-gray-200 rounded text-[7px] text-gray-600 flex items-center justify-center">Estoy bien</div>
                  </div>
                </div>
              </div>
            </SubSection>

            <SubSection title="Admin y Auditoría" source="WebAdmin.tsx">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b text-[10px] font-bold text-gray-600">Gestión de Usuarios</div>
                  <div className="h-44 flex">
                    <div className="w-8 bg-[#001C55]" />
                    <div className="flex-1 p-1.5 bg-gray-50 space-y-1">
                      <div className="flex gap-0.5">{['Usuarios', 'Roles', 'Integ.', 'Audit.'].map(t => <div key={t} className={`flex-1 h-4 rounded text-[7px] text-center py-0.5 ${t === 'Usuarios' ? 'bg-white border border-gray-200 text-gray-800 font-bold' : 'bg-gray-100 text-gray-400'}`}>{t}</div>)}</div>
                      <div className="grid grid-cols-4 gap-0.5">{[1,2,3,4].map(i => <div key={i} className="h-5 bg-white border border-gray-100 rounded" />)}</div>
                      <div className="space-y-0.5">
                        {[1,2,3].map(i => <div key={i} className="h-4 bg-white border border-gray-100 rounded flex items-center px-1 gap-0.5"><div className="w-3 h-3 bg-purple-200 rounded" /><div className="flex-1 h-1.5 bg-gray-100 rounded" /></div>)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b text-[10px] font-bold text-gray-600">Auditoría</div>
                  <div className="h-44 flex">
                    <div className="w-8 bg-[#001C55]" />
                    <div className="flex-1 p-1.5 bg-gray-50 space-y-1">
                      <div className="flex gap-0.5">{['Usuarios', 'Roles', 'Integ.', 'Audit.'].map(t => <div key={t} className={`flex-1 h-4 rounded text-[7px] text-center py-0.5 ${t === 'Audit.' ? 'bg-white border border-gray-200 text-gray-800 font-bold' : 'bg-gray-100 text-gray-400'}`}>{t}</div>)}</div>
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className="flex items-center gap-1 p-1 bg-white border border-gray-100 rounded">
                          <div className="w-3 h-3 bg-blue-100 rounded-full" />
                          <div className="flex-1 h-1.5 bg-gray-100 rounded" />
                          <div className="text-[6px] text-gray-300">10:0{i}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </SubSection>

            <SubSection title="WhatsApp Integration" source="WebWhatsApp.tsx">
              <div className="rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b text-[10px] font-bold text-gray-600">Gestión de Chats WhatsApp</div>
                <div className="h-44 flex">
                  <div className="w-8 bg-[#001C55]" />
                  <div className="w-32 bg-white border-r border-gray-200 p-1.5 space-y-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`flex items-center gap-1 p-1 rounded ${i === 1 ? 'bg-blue-50' : ''}`}>
                        <div className="w-4 h-4 bg-[#25D366] rounded-full shrink-0" />
                        <div className="flex-1 space-y-0.5">
                          <div className="h-1.5 bg-gray-200 rounded w-3/4" />
                          <div className="h-1 bg-gray-100 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 p-1.5 bg-gray-50 space-y-1">
                    <div className="h-5 bg-white border border-gray-200 rounded" />
                    <div className="flex-1 space-y-1 px-1">
                      <div className="flex justify-start"><div className="h-4 w-16 bg-white border border-gray-200 rounded-lg" /></div>
                      <div className="flex justify-end"><div className="h-4 w-20 bg-[#25D366]/20 border border-[#25D366]/30 rounded-lg" /></div>
                      <div className="flex justify-start"><div className="h-4 w-14 bg-blue-50 border border-blue-100 rounded-lg" /></div>
                    </div>
                  </div>
                </div>
              </div>
            </SubSection>
          </section>

          {/* ════════════════════ 21. ICONS ════════════════════ */}
          <section>
            <SectionTitle id="icons">21. Iconografía</SectionTitle>

            <SubSection title="lucide-react — Íconos más usados" source="lucide-react v0.487.0">
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                {[
                  { Icon: Shield, name: 'Shield' },
                  { Icon: MapPin, name: 'MapPin' },
                  { Icon: AlertTriangle, name: 'AlertTriangle' },
                  { Icon: CheckCircle, name: 'CheckCircle' },
                  { Icon: Clock, name: 'Clock' },
                  { Icon: Search, name: 'Search' },
                  { Icon: Bell, name: 'Bell' },
                  { Icon: Settings, name: 'Settings' },
                  { Icon: FileText, name: 'FileText' },
                  { Icon: BarChart3, name: 'BarChart3' },
                  { Icon: Eye, name: 'Eye' },
                  { Icon: Edit, name: 'Edit' },
                  { Icon: Trash2, name: 'Trash2' },
                  { Icon: Plus, name: 'Plus' },
                  { Icon: X, name: 'X' },
                  { Icon: Filter, name: 'Filter' },
                  { Icon: MessageCircle, name: 'MessageCircle' },
                  { Icon: User, name: 'User' },
                  { Icon: Mail, name: 'Mail' },
                  { Icon: Lock, name: 'Lock' },
                  { Icon: Radio, name: 'Radio' },
                  { Icon: Zap, name: 'Zap' },
                  { Icon: Navigation, name: 'Navigation' },
                  { Icon: Camera, name: 'Camera' },
                  { Icon: Megaphone, name: 'Megaphone' },
                  { Icon: Download, name: 'Download' },
                  { Icon: Upload, name: 'Upload' },
                  { Icon: Info, name: 'Info' },
                  { Icon: ChevronRight, name: 'ChevronRight' },
                  { Icon: ExternalLink, name: 'ExternalLink' },
                  { Icon: Copy, name: 'Copy' },
                  { Icon: Star, name: 'Star' },
                ].map(({ Icon, name }) => (
                  <div key={name} className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                    <Icon className="w-5 h-5 text-gray-700" />
                    <span className="text-[9px] text-gray-400 font-mono">{name}</span>
                  </div>
                ))}
              </div>
            </SubSection>

            <SubSection title="Tamaños de Ícono Estándar" source="Convención del proyecto">
              <div className="flex gap-6 items-end flex-wrap">
                {[
                  { size: 'w-3 h-3', label: '12px · Inline' },
                  { size: 'w-4 h-4', label: '16px · Default' },
                  { size: 'w-5 h-5', label: '20px · Nav/Btn' },
                  { size: 'w-6 h-6', label: '24px · Stats' },
                  { size: 'w-8 h-8', label: '32px · Featured' },
                  { size: 'w-10 h-10', label: '40px · Hero' },
                  { size: 'w-14 h-14', label: '56px · Alerta' },
                ].map(s => (
                  <div key={s.label} className="flex flex-col items-center gap-2">
                    <Shield className={`${s.size} text-[#001C55]`} />
                    <span className="text-[9px] text-gray-400 font-mono text-center">{s.label}</span>
                  </div>
                ))}
              </div>
            </SubSection>

            <SubSection title="Emojis como Íconos" source="PWAReportar.tsx · PWAHome.tsx">
              <div className="flex gap-3 flex-wrap">
                {['🚨', '🚗', '🔥', '👊', '🏥', '💥', '👤', '📋', '🔍', '📦', '🛡️', '💡', '📱', '👥', '📍', '⏱️', '🆘'].map(e => (
                  <div key={e} className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-xl border border-gray-100">{e}</div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-2">Emojis Unicode usados como íconos decorativos en grids de categoría, tips y empty states.</p>
            </SubSection>
          </section>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-6 pb-4 text-center">
            <p className="text-xs text-gray-400">SafeCampus PUCP · UI Component Showcase</p>
            <p className="text-[10px] text-gray-300 mt-1">Generado como documentación para el equipo UI/UX. Todos los componentes están renderizados en vivo.</p>
          </div>

        </main>
      </div>
    </div>
  );
}
