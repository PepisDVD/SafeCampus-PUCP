export type UserRole = 'comunidad' | 'operador' | 'supervisor' | 'admin';
export type IncidentSeverity = 'critico' | 'alto' | 'medio' | 'bajo';
export type IncidentStatus = 'nuevo' | 'en_atencion' | 'pendiente' | 'resuelto' | 'cerrado';
export type IncidentType =
  | 'robo'
  | 'accidente'
  | 'incendio'
  | 'violencia'
  | 'emergencia_medica'
  | 'vandalismo'
  | 'sospechoso'
  | 'otro';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  department?: string;
  code?: string;
  status: 'activo' | 'inactivo' | 'suspendido';
  lastLogin?: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  location: string;
  zone: string;
  reportedBy: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  channel: 'web' | 'movil' | 'whatsapp' | 'presencial';
  x: number; // campus map x%
  y: number; // campus map y%
  history?: { time: string; action: string; by: string }[];
}

export interface LostFoundItem {
  id: string;
  type: 'perdido' | 'encontrado';
  category: string;
  description: string;
  location: string;
  date: string;
  reportedBy: string;
  status: 'activo' | 'cerrado';
  imageUrl?: string;
}

export interface KPIData {
  label: string;
  value: number | string;
  trend?: number;
  unit?: string;
  color?: string;
}

// ─────────────────────────────────────
// MOCK USERS
// ─────────────────────────────────────
export const mockUsers: User[] = [
  { id: 'U001', name: 'María García López', role: 'comunidad', email: 'a20201234@pucp.edu.pe', department: 'Ingeniería Informática', code: '20201234', status: 'activo', lastLogin: '2026-03-23 08:15' },
  { id: 'U002', name: 'Carlos Mendoza Ríos', role: 'comunidad', email: 'c.mendoza@pucp.edu.pe', department: 'Estudios Generales Ciencias', code: '20183456', status: 'activo', lastLogin: '2026-03-22 14:30' },
  { id: 'U003', name: 'Jorge Salinas Torres', role: 'operador', email: 'jsalinas@pucp.edu.pe', department: 'Seguridad Campus', code: 'OP-023', status: 'activo', lastLogin: '2026-03-23 06:00' },
  { id: 'U004', name: 'Rosa Quispe Mamani', role: 'operador', email: 'rquispe@pucp.edu.pe', department: 'Seguridad Campus', code: 'OP-017', status: 'activo', lastLogin: '2026-03-23 07:45' },
  { id: 'U005', name: 'Luis Fernández Castro', role: 'supervisor', email: 'lfernandez@pucp.edu.pe', department: 'Jefatura de Seguridad', code: 'SUP-004', status: 'activo', lastLogin: '2026-03-23 08:00' },
  { id: 'U006', name: 'Ana Torres Vega', role: 'admin', email: 'atorres@pucp.edu.pe', department: 'DITIC', code: 'ADM-001', status: 'activo', lastLogin: '2026-03-23 07:30' },
  { id: 'U007', name: 'Prof. Roberto Silva', role: 'comunidad', email: 'r.silva@pucp.edu.pe', department: 'Facultad de Derecho', code: 'DOC-112', status: 'activo', lastLogin: '2026-03-21 10:00' },
  { id: 'U008', name: 'Elena Paredes Núñez', role: 'comunidad', email: 'e.paredes@pucp.edu.pe', department: 'RRHH', code: 'ADM-234', status: 'inactivo', lastLogin: '2026-03-10 09:00' },
  { id: 'U009', name: 'Marco Díaz Lozano', role: 'operador', email: 'mdiaz@pucp.edu.pe', department: 'Seguridad Campus', code: 'OP-031', status: 'activo', lastLogin: '2026-03-23 06:30' },
  { id: 'U010', name: 'Sandra Rojas Huanca', role: 'supervisor', email: 'srojas@pucp.edu.pe', department: 'Jefatura de Seguridad', code: 'SUP-002', status: 'suspendido', lastLogin: '2026-03-15 11:00' },
];

// ─────────────────────────────────────
// MOCK INCIDENTS
// ─────────────────────────────────────
export const mockIncidents: Incident[] = [
  {
    id: 'INC-2026-0342',
    title: 'Robo de laptop en biblioteca central',
    description: 'Estudiante reporta robo de laptop marca Dell dentro de la biblioteca central, piso 2. Sospechoso identificado como persona externa al campus.',
    type: 'robo',
    severity: 'alto',
    status: 'en_atencion',
    location: 'Biblioteca Central - Piso 2',
    zone: 'Zona Central',
    reportedBy: 'María García López',
    assignedTo: 'Jorge Salinas Torres',
    createdAt: '2026-03-23 09:15',
    updatedAt: '2026-03-23 09:32',
    channel: 'movil',
    x: 52, y: 40,
    history: [
      { time: '09:15', action: 'Incidente registrado vía app móvil', by: 'Sistema' },
      { time: '09:17', action: 'Clasificado como ALTO por IA', by: 'Sistema IA' },
      { time: '09:20', action: 'Asignado a Operador Jorge Salinas', by: 'Sistema' },
      { time: '09:32', action: 'Operador en camino al lugar', by: 'Jorge Salinas' },
    ],
  },
  {
    id: 'INC-2026-0341',
    title: 'Emergencia médica - Desmayo en Patio de Letras',
    description: 'Estudiante femenina presentó desmayo en el Patio de Letras. Requiere atención médica inmediata.',
    type: 'emergencia_medica',
    severity: 'critico',
    status: 'en_atencion',
    location: 'Patio de Letras',
    zone: 'Zona Humanidades',
    reportedBy: 'Carlos Mendoza Ríos',
    assignedTo: 'Rosa Quispe Mamani',
    createdAt: '2026-03-23 08:50',
    updatedAt: '2026-03-23 09:05',
    channel: 'movil',
    x: 30, y: 55,
    history: [
      { time: '08:50', action: 'Alerta de emergencia enviada', by: 'Carlos Mendoza' },
      { time: '08:52', action: 'Clasificado como CRÍTICO - Emergencia Médica', by: 'Sistema IA' },
      { time: '08:53', action: 'Protocolos de emergencia activados', by: 'Sistema' },
      { time: '09:05', action: 'Operadora en lugar, coordinando con tópico', by: 'Rosa Quispe' },
    ],
  },
  {
    id: 'INC-2026-0340',
    title: 'Persona sospechosa rondando estacionamiento',
    description: 'Se observa persona ajena al campus rondando el estacionamiento principal, con comportamiento sospechoso.',
    type: 'sospechoso',
    severity: 'medio',
    status: 'nuevo',
    location: 'Estacionamiento Principal',
    zone: 'Zona Ingreso',
    reportedBy: 'Prof. Roberto Silva',
    createdAt: '2026-03-23 09:40',
    updatedAt: '2026-03-23 09:40',
    channel: 'web',
    x: 75, y: 25,
  },
  {
    id: 'INC-2026-0339',
    title: 'Vandalismo en baños del Pabellón H',
    description: 'Daños a instalaciones de los baños del tercer piso del Pabellón H. Grafitis y daños en puertas.',
    type: 'vandalismo',
    severity: 'bajo',
    status: 'pendiente',
    location: 'Pabellón H - Piso 3',
    zone: 'Zona Ciencias',
    reportedBy: 'Elena Paredes Núñez',
    assignedTo: 'Marco Díaz Lozano',
    createdAt: '2026-03-23 07:20',
    updatedAt: '2026-03-23 08:10',
    channel: 'web',
    x: 65, y: 65,
  },
  {
    id: 'INC-2026-0338',
    title: 'Accidente menor en ciclovía interna',
    description: 'Colisión leve entre bicicleta y peatón. Sin lesiones graves, solo raspones.',
    type: 'accidente',
    severity: 'bajo',
    status: 'resuelto',
    location: 'Ciclovía - Sector B',
    zone: 'Zona Deportiva',
    reportedBy: 'María García López',
    assignedTo: 'Jorge Salinas Torres',
    createdAt: '2026-03-22 16:30',
    updatedAt: '2026-03-22 17:45',
    channel: 'movil',
    x: 20, y: 70,
  },
  {
    id: 'INC-2026-0337',
    title: 'Intento de robo en Facultad de Ingeniería',
    description: 'Estudiante reporta intento de arrebato de celular en los pasillos del primer piso de Ingeniería.',
    type: 'robo',
    severity: 'alto',
    status: 'cerrado',
    location: 'Facultad de Ingeniería - Piso 1',
    zone: 'Zona Ciencias',
    reportedBy: 'Carlos Mendoza Ríos',
    assignedTo: 'Rosa Quispe Mamani',
    createdAt: '2026-03-22 12:15',
    updatedAt: '2026-03-22 15:30',
    channel: 'whatsapp',
    x: 60, y: 50,
  },
  {
    id: 'INC-2026-0336',
    title: 'Conato de incendio en cafetería',
    description: 'Pequeño incendio en cocina de cafetería central fue sofocado rápidamente. Sin heridos.',
    type: 'incendio',
    severity: 'critico',
    status: 'cerrado',
    location: 'Cafetería Central',
    zone: 'Zona Central',
    reportedBy: 'Sistema - Sensor IoT',
    assignedTo: 'Marco Díaz Lozano',
    createdAt: '2026-03-22 13:00',
    updatedAt: '2026-03-22 14:20',
    channel: 'presencial',
    x: 48, y: 48,
  },
];

// ─────────────────────────────────────
// MOCK LOST & FOUND
// ─────────────────────────────────────
export const mockLostFound: LostFoundItem[] = [
  {
    id: 'LF-001',
    type: 'perdido',
    category: 'Electrónico',
    description: 'Audífonos Sony WH-1000XM4 color negro. Perdido cerca de las mesas de estudio del piso 1.',
    location: 'Biblioteca Central',
    date: '2026-03-23',
    reportedBy: 'María García López',
    status: 'activo',
    imageUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=300',
  },
  {
    id: 'LF-002',
    type: 'encontrado',
    category: 'Documentos',
    description: 'Carné universitario y DNI encontrados en la cafetería central. Nombre: J. Rodríguez.',
    location: 'Cafetería Central',
    date: '2026-03-23',
    reportedBy: 'Carlos Mendoza Ríos',
    status: 'activo',
  },
  {
    id: 'LF-003',
    type: 'perdido',
    category: 'Mochila/Bolso',
    description: 'Mochila azul Totto con libros de cálculo y una laptop HP. Se perdió en el Pabellón A.',
    location: 'Pabellón A',
    date: '2026-03-22',
    reportedBy: 'Prof. Roberto Silva',
    status: 'activo',
  },
  {
    id: 'LF-004',
    type: 'encontrado',
    category: 'Ropa/Accesorios',
    description: 'Casaca universitaria PUCP azul talla M encontrada en los campos deportivos.',
    location: 'Campos Deportivos',
    date: '2026-03-22',
    reportedBy: 'Elena Paredes Núñez',
    status: 'activo',
    imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=300',
  },
  {
    id: 'LF-005',
    type: 'perdido',
    category: 'Electrónico',
    description: 'iPhone 15 Pro Max con funda transparente. Posiblemente en el estacionamiento.',
    location: 'Estacionamiento',
    date: '2026-03-21',
    reportedBy: 'Carlos Mendoza Ríos',
    status: 'cerrado',
  },
  {
    id: 'LF-006',
    type: 'encontrado',
    category: 'Llaves',
    description: 'Llavero con 3 llaves y un llavero de forma de corazón.',
    location: 'Pabellón H',
    date: '2026-03-21',
    reportedBy: 'María García López',
    status: 'cerrado',
  },
];

// ─────────────────────────────────────
// MOCK KPIs
// ─────────────────────────────────────
export const kpiCards: KPIData[] = [
  { label: 'FRT Promedio', value: '4.2 min', trend: -12, unit: 'min', color: 'green' },
  { label: 'TMR Promedio', value: '38 min', trend: -8, unit: 'min', color: 'green' },
  { label: 'Total Incidentes (mes)', value: 87, trend: 5, color: 'blue' },
  { label: 'Tasa de Resolución', value: '94%', trend: 3, color: 'green' },
  { label: 'Incidentes Críticos', value: 6, trend: -2, color: 'red' },
  { label: 'SLA Cumplimiento', value: '91%', trend: 2, color: 'green' },
];

export const incidentsByMonth = [
  { mes: 'Oct', total: 45, resueltos: 42, criticos: 3 },
  { mes: 'Nov', total: 62, resueltos: 58, criticos: 5 },
  { mes: 'Dic', total: 38, resueltos: 36, criticos: 2 },
  { mes: 'Ene', total: 71, resueltos: 65, criticos: 8 },
  { mes: 'Feb', total: 83, resueltos: 79, criticos: 6 },
  { mes: 'Mar', total: 87, resueltos: 73, criticos: 6 },
];

export const incidentsByType = [
  { name: 'Robo', value: 28, color: '#EF4444' },
  { name: 'Acc. Médica', value: 18, color: '#F59E0B' },
  { name: 'Vandalismo', value: 15, color: '#8B5CF6' },
  { name: 'Sospechoso', value: 12, color: '#3B82F6' },
  { name: 'Accidente', value: 9, color: '#F97316' },
  { name: 'Incendio', value: 3, color: '#DC2626' },
  { name: 'Otro', value: 2, color: '#6B7280' },
];

export const incidentsByZone = [
  { zone: 'Zona Central', value: 32 },
  { zone: 'Zona Ciencias', value: 24 },
  { zone: 'Zona Humanidades', value: 16 },
  { zone: 'Zona Deportiva', value: 8 },
  { zone: 'Zona Ingreso', value: 7 },
];

// ─────────────────────────────────────
// WHATSAPP CONVERSATIONS
// ─────────────────────────────────────
export type ChatPriority = 'alta' | 'media' | 'baja';
export type ChatStatus = 'bot' | 'humano' | 'esperando' | 'cerrado';

export interface WhatsAppMessage {
  id: string;
  from: 'user' | 'bot' | 'agent';
  text: string;
  time: string;
}

export interface WhatsAppChat {
  id: string;
  phone: string;
  contactName: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  status: ChatStatus;
  priority: ChatPriority;
  assignedTo?: string;
  incidentId?: string;
  messages: WhatsAppMessage[];
}

export const whatsappChats: WhatsAppChat[] = [
  {
    id: 'WA-001',
    phone: '+51 987 654 321',
    contactName: 'María García López',
    lastMessage: '¡Ayuda! Acabo de ver a alguien sospechoso',
    lastMessageTime: '09:42',
    unread: 3,
    status: 'esperando',
    priority: 'alta',
    incidentId: 'INC-2026-0342',
    messages: [
      { id: 'm1', from: 'user', text: 'Hola, necesito reportar una situación', time: '09:35' },
      { id: 'm2', from: 'bot', text: '¡Hola! Soy el asistente de SafeCampus PUCP. ¿Qué tipo de incidente deseas reportar?\n\n1️⃣ Robo o hurto\n2️⃣ Emergencia médica\n3️⃣ Persona sospechosa\n4️⃣ Otro', time: '09:35' },
      { id: 'm3', from: 'user', text: '3', time: '09:36' },
      { id: 'm4', from: 'bot', text: '¿Puedes describir la situación y tu ubicación actual?', time: '09:36' },
      { id: 'm5', from: 'user', text: 'Hay alguien rondando el estacionamiento, parece que está revisando los autos', time: '09:38' },
      { id: 'm6', from: 'bot', text: 'Entendido. He registrado tu reporte. Un operador revisará tu caso pronto. Tu ID de incidente es INC-2026-0342.', time: '09:38' },
      { id: 'm7', from: 'user', text: '¡Ayuda! Acabo de ver a alguien sospechoso cerca de mi auto', time: '09:42' },
    ],
  },
  {
    id: 'WA-002',
    phone: '+51 912 345 678',
    contactName: 'Carlos Mendoza Ríos',
    lastMessage: 'Sí, la ambulancia ya llegó. Gracias por la ayuda rápida.',
    lastMessageTime: '09:10',
    unread: 0,
    status: 'humano',
    priority: 'alta',
    assignedTo: 'Rosa Quispe Mamani',
    incidentId: 'INC-2026-0341',
    messages: [
      { id: 'm1', from: 'user', text: 'EMERGENCIA - Alguien se desmayó en el Patio de Letras', time: '08:48' },
      { id: 'm2', from: 'bot', text: '⚠️ Emergencia detectada. Estoy transfiriendo tu conversación a un operador de seguridad inmediatamente.', time: '08:48' },
      { id: 'm3', from: 'agent', text: 'Soy Rosa del equipo de seguridad. ¿La persona está consciente? ¿Respira?', time: '08:50' },
      { id: 'm4', from: 'user', text: 'Sí respira pero no responde. Es una chica como de 20 años', time: '08:51' },
      { id: 'm5', from: 'agent', text: 'Estoy enviando al equipo médico. Por favor no la muevas. ¿Puedes quedarte con ella?', time: '08:52' },
      { id: 'm6', from: 'user', text: 'Sí, aquí estoy', time: '08:53' },
      { id: 'm7', from: 'agent', text: 'El equipo médico está en camino, llegarán en 2 minutos. ¿Ha recuperado la consciencia?', time: '08:55' },
      { id: 'm8', from: 'user', text: 'Sí, la ambulancia ya llegó. Gracias por la ayuda rápida.', time: '09:10' },
    ],
  },
  {
    id: 'WA-003',
    phone: '+51 945 678 123',
    contactName: 'Prof. Roberto Silva',
    lastMessage: 'Gracias, estaré atento.',
    lastMessageTime: '09:50',
    unread: 0,
    status: 'bot',
    priority: 'media',
    messages: [
      { id: 'm1', from: 'user', text: 'Buenas, quiero consultar sobre un objeto que encontré', time: '09:45' },
      { id: 'm2', from: 'bot', text: '¡Hola Prof. Silva! ¿Deseas reportar un objeto encontrado? Puedo ayudarte con eso.', time: '09:45' },
      { id: 'm3', from: 'user', text: 'Sí, encontré una mochila azul en el Pabellón A', time: '09:46' },
      { id: 'm4', from: 'bot', text: 'He registrado el objeto encontrado: Mochila azul - Pabellón A. Se publicará en Lost & Found. ¿Deseas agregar más detalles o una foto?', time: '09:47' },
      { id: 'm5', from: 'user', text: 'No, solo eso. La dejé en recepción.', time: '09:48' },
      { id: 'm6', from: 'bot', text: 'Perfecto. El objeto ha sido registrado con ID LF-003. Si alguien reclama la mochila, te notificaremos. ¡Gracias por reportar!', time: '09:48' },
      { id: 'm7', from: 'user', text: 'Gracias, estaré atento.', time: '09:50' },
    ],
  },
  {
    id: 'WA-004',
    phone: '+51 976 543 210',
    contactName: 'Elena Paredes Núñez',
    lastMessage: '¿Ya pudieron revisar lo del baño?',
    lastMessageTime: '08:30',
    unread: 1,
    status: 'esperando',
    priority: 'baja',
    incidentId: 'INC-2026-0339',
    messages: [
      { id: 'm1', from: 'user', text: 'Quiero reportar vandalismo en el Pabellón H', time: '07:15' },
      { id: 'm2', from: 'bot', text: 'Lamento escuchar eso. ¿Puedes describir los daños y la ubicación exacta?', time: '07:15' },
      { id: 'm3', from: 'user', text: 'Baños del tercer piso, las puertas están dañadas y hay grafitis', time: '07:16' },
      { id: 'm4', from: 'bot', text: 'Tu reporte fue registrado con ID INC-2026-0339. Se asignará a un operador. ¿Deseas agregar fotos?', time: '07:17' },
      { id: 'm5', from: 'user', text: '¿Ya pudieron revisar lo del baño?', time: '08:30' },
    ],
  },
  {
    id: 'WA-005',
    phone: '+51 999 888 777',
    contactName: 'Lucía Ramírez Soto',
    lastMessage: 'Ok perfecto!',
    lastMessageTime: 'ayer',
    unread: 0,
    status: 'cerrado',
    priority: 'baja',
    messages: [
      { id: 'm1', from: 'user', text: 'Hola, ¿cómo puedo activar el acompañamiento seguro?', time: '16:20' },
      { id: 'm2', from: 'bot', text: '¡Hola Lucía! Para solicitar acompañamiento seguro puedes usar la opción "Acompañamiento" en la app SafeCampus, o indicarme aquí tu ubicación de origen y destino.', time: '16:20' },
      { id: 'm3', from: 'user', text: 'Estoy en la Biblioteca Central y necesito ir al estacionamiento', time: '16:21' },
      { id: 'm4', from: 'bot', text: 'He solicitado un acompañamiento desde Biblioteca Central al Estacionamiento. Un agente de seguridad estará contigo en ~5 minutos. Recibirás una confirmación.', time: '16:22' },
      { id: 'm5', from: 'user', text: 'Ok perfecto!', time: '16:22' },
    ],
  },
  {
    id: 'WA-006',
    phone: '+51 911 222 333',
    contactName: 'Número desconocido',
    lastMessage: 'hola',
    lastMessageTime: '09:55',
    unread: 1,
    status: 'bot',
    priority: 'media',
    messages: [
      { id: 'm1', from: 'user', text: 'hola', time: '09:55' },
    ],
  },
];

// ─────────────────────────────────────
// SYSTEM INTEGRATIONS
// ─────────────────────────────────────
export const integrations = [
  { name: 'PUCP SSO (Shibboleth)', status: 'operativo', uptime: '99.9%', lastCheck: 'hace 2 min' },
  { name: 'Servicio de Notificaciones Push', status: 'operativo', uptime: '98.7%', lastCheck: 'hace 1 min' },
  { name: 'Gateway WhatsApp', status: 'degradado', uptime: '87.2%', lastCheck: 'hace 5 min' },
  { name: 'Módulo IA Clasificación', status: 'operativo', uptime: '99.1%', lastCheck: 'hace 3 min' },
  { name: 'Servicio de Mapas Campus', status: 'operativo', uptime: '100%', lastCheck: 'hace 1 min' },
  { name: 'Email SMTP PUCP', status: 'operativo', uptime: '99.5%', lastCheck: 'hace 4 min' },
  { name: 'Backup & Storage', status: 'operativo', uptime: '100%', lastCheck: 'hace 10 min' },
  { name: 'API Directorio Institucional', status: 'inactivo', uptime: '0%', lastCheck: 'hace 45 min' },
];

// ─────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────
export const mockNotifications = [
  { id: 1, title: 'Tu reporte fue recibido', body: 'El incidente INC-2026-0342 fue registrado exitosamente.', time: 'hace 15 min', read: false, type: 'success' },
  { id: 2, title: 'Actualización de estado', body: 'Tu caso INC-2026-0342 está siendo atendido por un operador.', time: 'hace 10 min', read: false, type: 'info' },
  { id: 3, title: 'Lost & Found - Coincidencia', body: 'Se encontró un objeto que coincide con tu reporte LF-001.', time: 'hace 2 horas', read: true, type: 'info' },
  { id: 4, title: 'Alerta de seguridad en campus', body: 'Zona Ciencias: Mantenga precaución en el área del Pabellón H.', time: 'ayer', read: true, type: 'warning' },
  { id: 5, title: 'Caso cerrado', body: 'El incidente INC-2026-0338 fue cerrado satisfactoriamente.', time: 'ayer', read: true, type: 'success' },
];

// ─────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────
export const auditLog = [
  { id: 1, user: 'Ana Torres Vega', action: 'Modificó rol de usuario', detail: 'Marco Díaz → Operador Senior', time: '2026-03-23 08:45' },
  { id: 2, user: 'Luis Fernández Castro', action: 'Escaló incidente', detail: 'INC-2026-0341 → Crítico', time: '2026-03-23 08:52' },
  { id: 3, user: 'Sistema', action: 'Alerta de integración', detail: 'API Directorio Institucional sin respuesta', time: '2026-03-23 08:15' },
  { id: 4, user: 'Jorge Salinas Torres', action: 'Cerró incidente', detail: 'INC-2026-0338 → Resuelto', time: '2026-03-22 17:45' },
  { id: 5, user: 'Ana Torres Vega', action: 'Creó usuario', detail: 'Nuevo operador: Marco Díaz Lozano', time: '2026-03-22 10:00' },
];
