import { Suspense } from "react";

import { LostFoundAdmin } from "@/features/lost-found/components/lost-found-admin";
import { LfBreadcrumb } from "@/features/lost-found/components/lf-breadcrumb";
import { getLostFoundAdmin } from "@/features/lost-found/service";

export default async function LostFoundAdminPage() {
  const { categorias, matchingConfig, politicaCustodia, motivosCierre } = await getLostFoundAdmin();
  return (
    <Suspense>
      <LfBreadcrumb
        items={[
          { label: "Lost & Found", href: "/lost-found-operaciones" },
          { label: "Configuración" },
        ]}
      />
      <LostFoundAdmin categorias={categorias} matchingConfig={matchingConfig} politicaCustodia={politicaCustodia} motivosCierre={motivosCierre} />
    </Suspense>
  );
}
