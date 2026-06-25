import { redirect } from "next/navigation";

import { LostFoundLogistica } from "@/features/lost-found/components/lost-found-logistica";
import { LfBreadcrumb } from "@/features/lost-found/components/lf-breadcrumb";
import { getLostFoundAccess, getLostFoundLogistica } from "@/features/lost-found/service";

export default async function LostFoundLogisticaPage() {
  if (!(await getLostFoundAccess())) redirect("/dashboard");
  const { custodias, casos, motivosDescarte } = await getLostFoundLogistica();
  return (
    <>
      <LfBreadcrumb
        items={[
          { label: "Lost & Found", href: "/lost-found-operaciones" },
          { label: "Logística" },
        ]}
      />
      <LostFoundLogistica initialCustodias={custodias} casos={casos} motivosDescarte={motivosDescarte} />
    </>
  );
}
