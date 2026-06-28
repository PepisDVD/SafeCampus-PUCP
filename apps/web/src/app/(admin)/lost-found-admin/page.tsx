import { Suspense } from "react";

import { LostFoundAdmin } from "@/features/lost-found/components/lost-found-admin";
import { LfBreadcrumb } from "@/features/lost-found/components/lf-breadcrumb";
import {
  getLostFoundAdminCategorias,
  getLostFoundAdminReglasOperativas,
} from "@/features/lost-found/service";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const VALID_TABS = new Set(["categorias", "reglas-operativas", "custodia"]);

function normalizeTab(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = raw === "matching" || raw === "ciclo-vida" ? "reglas-operativas" : raw;
  return VALID_TABS.has(normalized ?? "") ? normalized : "categorias";
}

export default async function LostFoundAdminPage({ searchParams }: Props) {
  const params = await searchParams;
  const tab = normalizeTab(params?.tab);
  const data =
    tab === "categorias"
      ? { categorias: await getLostFoundAdminCategorias() }
      : tab === "reglas-operativas"
        ? await getLostFoundAdminReglasOperativas()
        : {};

  return (
    <Suspense>
      <LfBreadcrumb
        items={[
          { label: "Lost & Found", href: "/lost-found-operaciones" },
          { label: "Configuracion" },
        ]}
      />
      <LostFoundAdmin activeTab={tab} {...data} />
    </Suspense>
  );
}
