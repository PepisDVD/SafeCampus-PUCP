import { LostFoundCommunity } from "@/features/lost-found/components/lost-found-community";
import { getLostFoundBootstrap } from "@/features/lost-found/service";

export default async function LostFoundPage() {
  const { categorias, feed } = await getLostFoundBootstrap();
  return (
    <LostFoundCommunity
      categorias={categorias}
      initialFeed={feed}
    />
  );
}
