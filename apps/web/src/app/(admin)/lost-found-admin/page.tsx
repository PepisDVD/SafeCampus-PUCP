import { Suspense } from "react";

import { LostFoundAdmin } from "@/features/lost-found/components/lost-found-admin";
import { getLostFoundAdmin } from "@/features/lost-found/service";

export default async function LostFoundAdminPage() {
  const { categorias, matchingConfig, politicaCustodia, motivosCierre } = await getLostFoundAdmin();
  return (
    <Suspense>
      <LostFoundAdmin categorias={categorias} matchingConfig={matchingConfig} politicaCustodia={politicaCustodia} motivosCierre={motivosCierre} />
    </Suspense>
  );
}
