import type { DashboardStats, IncidentDetail, IncidentListItem } from "../types/api";

export const mockOperatorUser = {
  id: "mock-operator",
  email: "operador.seguridad@example.com",
  nombre: "Jorge",
  apellido: "Salinas Torres",
  codigo_institucional: "OP-023",
  departamento: "Seguridad Campus",
  telefono: "+51 999 888 777",
  roles: ["operador"],
};

export const mockIncidents: IncidentListItem[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    codigo: "INC-20260517-0001",
    titulo: "Robo de laptop en biblioteca central",
    descripcion: "Estudiante reporta robo de laptop en biblioteca central, piso 2.",
    estado: "EN_ATENCION",
    severidad: "ALTO",
    categoria: "robo",
    lugar_referencia: "Biblioteca Central",
    latitud: -12.0699,
    longitud: -77.0798,
    canal_origen: "MOVIL",
    operador_nombre: "Jorge Salinas Torres",
    created_at: "2026-05-17T14:15:00Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    codigo: "INC-20260517-0002",
    titulo: "Emergencia medica en Patio de Letras",
    descripcion: "Persona con desmayo. Se requiere apoyo inmediato.",
    estado: "RECIBIDO",
    severidad: "CRITICO",
    categoria: "emergencia_medica",
    lugar_referencia: "Patio de Letras",
    latitud: -12.0689,
    longitud: -77.0805,
    canal_origen: "MENSAJERIA",
    created_at: "2026-05-17T14:42:00Z",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    codigo: "INC-20260517-0003",
    titulo: "Persona sospechosa en estacionamiento",
    descripcion: "Ronda autos en el estacionamiento principal.",
    estado: "EN_EVALUACION",
    severidad: "MEDIO",
    categoria: "sospechoso",
    lugar_referencia: "Estacionamiento Principal",
    latitud: -12.0704,
    longitud: -77.0787,
    canal_origen: "WEB",
    operador_nombre: "Rosa Quispe Mamani",
    created_at: "2026-05-17T15:03:00Z",
  },
];

export const mockStats: DashboardStats = {
  total: 18,
  activos: 7,
  criticos: 1,
  en_atencion: 3,
  resueltos_24h: 4,
  por_zona: [
    { zona: "Zona Central", total: 5 },
    { zona: "Zona Ciencias", total: 3 },
    { zona: "Zona Ingreso", total: 2 },
  ],
};

export function buildMockDetail(item: IncidentListItem): IncidentDetail {
  return {
    ...item,
    updated_at: item.created_at ?? new Date().toISOString(),
    reportante: {
      id: "reportante",
      nombre_completo: "Comunidad PUCP",
      email: "comunidad@pucp.edu.pe",
    },
    operador_asignado: item.operador_nombre
      ? {
          id: "operador",
          nombre_completo: item.operador_nombre,
          email: "operador.seguridad@example.com",
        }
      : null,
    historial: [
      {
        id: "hist-1",
        accion: "Registro de incidente",
        estado_nuevo: "RECIBIDO",
        created_at: item.created_at ?? new Date().toISOString(),
      },
    ],
    comentarios: [
      {
        id: "com-1",
        autor: {
          id: "supervisor",
          nombre_completo: "Maria Flores (Supervisor)",
          email: "supervisor.seguridad@example.com",
        },
        contenido: "Operador, prioriza este caso y confirma cuando llegues al punto.",
        es_interno: true,
        created_at: item.created_at ?? new Date().toISOString(),
      },
    ],
  };
}
