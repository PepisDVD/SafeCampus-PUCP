/**
 * 📁 apps/web/src/features/admin/services/llm-audit.service.ts
 * 🎯 Servicio de auditoría de consumo LLM — llamadas al backend FastAPI.
 * 📦 Capa: Features / Admin / Services
 */

import { serverApi } from "@/lib/api/server";

export type LlmUsageItem = {
  id: string;
  conversacion_id: string;
  incidente_id: string | null;
  correlation_id: string;
  provider: string;
  model: string;
  prompt_version: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  latency_ms: number | null;
  fallback_applied: boolean;
  fallback_reason: string | null;
  created_at: string;
};

export type LlmUsageListResponse = {
  items: LlmUsageItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type LlmUsageProviderStat = {
  provider: string;
  total_calls: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  avg_latency_ms: number | null;
  fallback_count: number;
};

export type LlmUsageStatsResponse = {
  total_calls: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  avg_latency_ms: number | null;
  fallback_rate: number;
  unique_conversations: number;
  by_provider: LlmUsageProviderStat[];
  tokens_per_day: Array<{ day: string; total_tokens: number; calls: number }>;
};

export type LlmAuditFilters = {
  page?: number;
  page_size?: number;
  conversacion_id?: string;
  provider?: string;
  desde?: string;
  hasta?: string;
};

export async function listarLlmUsage(
  filters: LlmAuditFilters = {},
): Promise<LlmUsageListResponse> {
  const params: Record<string, string> = {
    page: String(filters.page ?? 1),
    page_size: String(filters.page_size ?? 20),
  };
  if (filters.conversacion_id) params.conversacion_id = filters.conversacion_id;
  if (filters.provider) params.provider = filters.provider;
  if (filters.desde) params.desde = filters.desde;
  if (filters.hasta) params.hasta = filters.hasta;

  return serverApi.get<LlmUsageListResponse>("/admin/llm-audit", params);
}

export async function obtenerLlmStats(
  desde?: string,
  hasta?: string,
): Promise<LlmUsageStatsResponse> {
  const params: Record<string, string> = {};
  if (desde) params.desde = desde;
  if (hasta) params.hasta = hasta;

  return serverApi.get<LlmUsageStatsResponse>("/admin/llm-audit/stats", params);
}

export async function listarProviders(): Promise<string[]> {
  return serverApi.get<string[]>("/admin/llm-audit/providers");
}
