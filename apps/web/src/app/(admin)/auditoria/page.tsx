import { Suspense } from "react";
import { Skeleton } from "@safecampus/ui-kit";
import {
  listarAuditoria,
  obtenerAccionesDistintas,
  obtenerModulosDistintos,
  obtenerUsuariosAuditoria,
} from "@/features/admin/services/auditoria.service";
import { AuditoriaClient } from "@/features/admin/components/auditoria/auditoria-client";
import { toLimaDateInputValue } from "@/lib/lima-date";

type SearchParams = {
  search?: string;
  modulo?: string;
  accion?: string;
  usuario_id?: string;
  entidad?: string;
  resultado?: string;
  desde?: string;
  hasta?: string;
  cursor?: string;
  page_size?: string;
};

function defaultDesde(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return toLimaDateInputValue(d);
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  // Por defecto: últimos 30 días (sólo si no hay filtro de fecha explícito).
  const hasDateFilter = Boolean(sp.desde || sp.hasta);
  const desde = sp.desde ?? (hasDateFilter ? undefined : defaultDesde());

  const [data, modulos, acciones, usuarios] = await Promise.all([
    listarAuditoria({
      search: sp.search,
      modulo: sp.modulo,
      accion: sp.accion,
      usuario_id: sp.usuario_id,
      entidad: sp.entidad,
      resultado: sp.resultado,
      desde,
      hasta: sp.hasta,
      cursor: sp.cursor,
      page_size: Number(sp.page_size ?? "25"),
    }),
    obtenerModulosDistintos(),
    obtenerAccionesDistintas(),
    obtenerUsuariosAuditoria(),
  ]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Log de Auditoría
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Registro centralizado de las acciones funcionales y de seguridad del
          sistema.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
        <AuditoriaClient
          initialData={data}
          modulos={modulos}
          acciones={acciones}
          usuarios={usuarios}
        />
      </Suspense>
    </div>
  );
}
