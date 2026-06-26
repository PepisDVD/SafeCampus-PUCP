import { redirect } from "next/navigation";

import { LostFoundLogistica } from "@/features/lost-found/components/lost-found-logistica";
import { LfBreadcrumb } from "@/features/lost-found/components/lf-breadcrumb";
import { getLostFoundAccess, getLostFoundLogistica } from "@/features/lost-found/service";

export default async function LostFoundLogisticaPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string }>;
}) {
  if (!(await getLostFoundAccess())) redirect("/dashboard");
  const params = await searchParams;
  const { custodias, casos, motivosDescarte, initialSearch } = await getLostFoundLogistica({ search: params?.search });
  return (
    <>
      <LfBreadcrumb
        items={[
          { label: "Lost & Found", href: "/lost-found-operaciones" },
          { label: "Logística" },
        ]}
      />
      <LostFoundLogistica initialCustodias={custodias} casos={casos} motivosDescarte={motivosDescarte} initialSearch={initialSearch} />
    </>
  );
}
