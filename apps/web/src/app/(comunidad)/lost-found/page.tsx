import { LostFoundCommunity } from "@/features/lost-found/components/lost-found-community";
import { getLostFoundBootstrap } from "@/features/lost-found/service";

export default async function LostFoundPage() {
  const { categorias, feed, misCasos, ubicaciones } = await getLostFoundBootstrap();
  return (
    <LostFoundCommunity
      categorias={categorias}
      initialFeed={feed}
      initialMine={misCasos}
      ubicaciones={ubicaciones}
    />
  );
}

