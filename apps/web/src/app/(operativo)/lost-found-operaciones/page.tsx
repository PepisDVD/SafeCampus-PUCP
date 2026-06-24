import { LostFoundOperativo } from "@/features/lost-found/components/lost-found-operativo";
import { LfBreadcrumb } from "@/features/lost-found/components/lf-breadcrumb";
import { getLostFoundOperativo } from "@/features/lost-found/service";

export default async function LostFoundOperativoPage() {
  const { casos, custodias, kpis } = await getLostFoundOperativo();
  return (
    <>
      <LfBreadcrumb
        items={[
          { label: "Lost & Found", href: "/lost-found-operaciones" },
          { label: "Dashboard" },
        ]}
      />
      <LostFoundOperativo
        initialCasos={casos}
        initialCustodias={custodias}
        kpis={kpis}
      />
    </>
  );
}
