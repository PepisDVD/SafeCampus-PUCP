import { Suspense } from "react";
import { Skeleton } from "@safecampus/ui-kit";
import { obtenerLlmStats } from "@/features/admin/services/llm-audit.service";
import { LlmDashboardClient } from "@/features/admin/components/llm-audit/llm-dashboard-client";

type SearchParams = {
  desde?: string;
  hasta?: string;
};

export default async function LlmDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const stats = await obtenerLlmStats(sp.desde, sp.hasta);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Auditoria LLM — Dashboard
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Metricas de consumo de tokens, latencia, fallbacks y gasto estimado del modulo de IA.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
        <LlmDashboardClient
          stats={stats}
          initialDesde={sp.desde ?? ""}
          initialHasta={sp.hasta ?? ""}
        />
      </Suspense>
    </div>
  );
}
