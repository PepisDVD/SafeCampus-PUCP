import { redirect } from "next/navigation";

import { LostFoundLogistica } from "@/features/lost-found/components/lost-found-logistica";
import { LfBreadcrumb } from "@/features/lost-found/components/lf-breadcrumb";
import { getLostFoundAccess, getLostFoundLogistica } from "@/features/lost-found/service";
import { getCurrentUserProfile } from "@/lib/auth/server";

export default async function LostFoundLogisticaPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string }>;
}) {
  if (!(await getLostFoundAccess())) redirect("/dashboard");
  const params = await searchParams;
  const [{ custodias, casos, motivosDescarte, initialSearch, ubicacionesCustodia, usuarios }, profile] = await Promise.all([
    getLostFoundLogistica({ search: params?.search }),
    getCurrentUserProfile(),
  ]);
  return (
    <>
      <LfBreadcrumb
        items={[
          { label: "Lost & Found", href: "/lost-found-operaciones" },
          { label: "Logística" },
        ]}
      />
      <LostFoundLogistica
        initialCustodias={custodias}
        casos={casos}
        motivosDescarte={motivosDescarte}
        initialSearch={initialSearch}
        ubicacionesCustodia={ubicacionesCustodia}
        usuarios={usuarios}
        currentUser={profile}
      />
    </>
  );
}
