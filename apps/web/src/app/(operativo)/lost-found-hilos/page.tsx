import { LostFoundThreads } from "@/features/lost-found/components/lost-found-threads";
import { getLostFoundThreads } from "@/features/lost-found/service";

export default async function LostFoundHilosPage() {
  const { casos, nextCursor, categorias, ubicaciones } = await getLostFoundThreads();
  return <LostFoundThreads initialCasos={casos} initialNextCursor={nextCursor} categorias={categorias} ubicaciones={ubicaciones} />;
}
