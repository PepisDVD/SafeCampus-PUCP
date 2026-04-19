/**
 * 📁 apps/web/src/constants/config.ts
 * 🎯 Configuración global del frontend: nombre, versión, URLs de API y WebSocket.
 * 📦 Capa: Constants
 */

export const APP_CONFIG = {
  name: "SafeCampus PUCP",
  description: "Plataforma omnicanal para gestión de incidentes en campus universitario",
  version: "0.1.0",
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
    wsUrl: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws",
  },
} as const;
