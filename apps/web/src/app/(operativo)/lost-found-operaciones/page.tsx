import { LostFoundOperativo } from "@/features/lost-found/components/lost-found-operativo";
import { getLostFoundOperativo } from "@/features/lost-found/service";

export default async function LostFoundOperativoPage() {
  const { casos, custodias, kpis } = await getLostFoundOperativo();
  return (
    <LostFoundOperativo
      initialCasos={casos}
      initialCustodias={custodias}
      kpis={kpis}
    />
  );
}
