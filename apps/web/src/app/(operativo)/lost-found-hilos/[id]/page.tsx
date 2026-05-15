import { LostFoundThreadDetail } from "@/features/lost-found/components/lost-found-thread-detail";
import { getLostFoundThreadDetail } from "@/features/lost-found/service";

export default async function LostFoundHiloDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getLostFoundThreadDetail(id);
  return <LostFoundThreadDetail initialCase={detail} />;
}

