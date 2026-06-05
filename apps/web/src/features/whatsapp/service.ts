import "server-only";

import type { OmnicanalStats } from "@safecampus/shared-types";

import { serverApi } from "@/lib/api/server";

export async function obtenerOmnicanalStats(): Promise<OmnicanalStats> {
  return serverApi.get<OmnicanalStats>("/omnicanal/conversaciones/stats");
}
