import { redirect } from "next/navigation";

import { LostFoundOperativo } from "@/features/lost-found/components/lost-found-operativo";
import { LfBreadcrumb } from "@/features/lost-found/components/lf-breadcrumb";
import { getLostFoundAccess, getLostFoundOperativo } from "@/features/lost-found/service";

export default async function LostFoundOperativoPage() {
  if (!(await getLostFoundAccess())) redirect("/dashboard");
  const { dashboard, categorias, initialFilters } = await getLostFoundOperativo();
  return (
    <>
      <LfBreadcrumb
        items={[
          { label: "Lost & Found", href: "/lost-found-operaciones" },
          { label: "Dashboard" },
        ]}
      />
      <LostFoundOperativo
        initialDashboard={dashboard}
        categorias={categorias}
        initialFilters={initialFilters}
      />
    </>
  );
}
