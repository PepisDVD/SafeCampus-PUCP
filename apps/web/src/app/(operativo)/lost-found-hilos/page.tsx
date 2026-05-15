import { LostFoundThreads } from "@/features/lost-found/components/lost-found-threads";
import { getLostFoundThreads } from "@/features/lost-found/service";

export default async function LostFoundHilosPage() {
  const { casos, categorias, ubicaciones } = await getLostFoundThreads();
  return <LostFoundThreads initialCasos={casos} categorias={categorias} ubicaciones={ubicaciones} />;
}

