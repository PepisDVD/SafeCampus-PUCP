import { serverApi } from "@/lib/api/server";

export type EstadoServicio = "OK" | "DEGRADADO" | "CAIDO" | "DESCONOCIDO";

export type EstadoIntegracion = {
  id: string;
  servicio: string;
  estado: EstadoServicio;
  tiempo_respuesta_ms: number | null;
  ultimo_check: string | null;
  detalle: Record<string, unknown> | null;
  updated_at: string;
};

export async function listarIntegraciones(): Promise<EstadoIntegracion[]> {
  const res = await serverApi.get<{ items: EstadoIntegracion[] }>("/admin/integraciones");
  return res.items;
}
