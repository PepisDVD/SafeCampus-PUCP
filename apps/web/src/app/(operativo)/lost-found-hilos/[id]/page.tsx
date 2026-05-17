import { LostFoundThreadDetail } from "@/features/lost-found/components/lost-found-thread-detail";
import { getLostFoundThreadDetail, getLostFoundThreadMatches } from "@/features/lost-found/service";

export default async function LostFoundHiloDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, matches] = await Promise.all([
    getLostFoundThreadDetail(id),
    getLostFoundThreadMatches(id),
  ]);
  return <LostFoundThreadDetail initialCase={detail} initialMatches={matches} />;
}
