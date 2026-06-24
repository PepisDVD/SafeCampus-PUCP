import { LostFoundLogistica } from "@/features/lost-found/components/lost-found-logistica";
import { LfBreadcrumb } from "@/features/lost-found/components/lf-breadcrumb";
import { getLostFoundLogistica } from "@/features/lost-found/service";

export default async function LostFoundLogisticaPage() {
  const { custodias, casos } = await getLostFoundLogistica();
  return (
    <>
      <LfBreadcrumb
        items={[
          { label: "Lost & Found", href: "/lost-found-operaciones" },
          { label: "Logística" },
        ]}
      />
      <LostFoundLogistica initialCustodias={custodias} casos={casos} />
    </>
  );
}
