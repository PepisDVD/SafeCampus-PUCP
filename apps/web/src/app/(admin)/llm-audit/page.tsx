import { Suspense } from "react";
import { Skeleton } from "@safecampus/ui-kit";
import {
  listarLlmUsage,
  listarProviders,
} from "@/features/admin/services/llm-audit.service";
import { LlmAuditTableClient } from "@/features/admin/components/llm-audit/llm-audit-table-client";

type SearchParams = {
  page?: string;
  page_size?: string;
  conversacion_id?: string;
  provider?: string;
  desde?: string;
  hasta?: string;
};

export default async function LlmAuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const [data, providers] = await Promise.all([
    listarLlmUsage({
      page: Number(sp.page ?? "1"),
      page_size: Number(sp.page_size ?? "20"),
      conversacion_id: sp.conversacion_id,
      provider: sp.provider,
      desde: sp.desde,
      hasta: sp.hasta,
    }),
    listarProviders(),
  ]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Auditoria LLM — Historial de uso
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Registro detallado de cada invocación del chatbot IA con consumo de tokens y latencia.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
        <LlmAuditTableClient initialData={data} providers={providers} />
      </Suspense>
    </div>
  );
}
