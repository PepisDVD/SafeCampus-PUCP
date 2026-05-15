import { LostFoundLogistica } from "@/features/lost-found/components/lost-found-logistica";
import { getLostFoundLogistica } from "@/features/lost-found/service";

export default async function LostFoundLogisticaPage() {
  const { custodias, casos } = await getLostFoundLogistica();
  return <LostFoundLogistica initialCustodias={custodias} casos={casos} />;
}
