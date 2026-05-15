import { LostFoundAdmin } from "@/features/lost-found/components/lost-found-admin";
import { getLostFoundAdmin } from "@/features/lost-found/service";

export default async function LostFoundAdminPage() {
  const { categorias, kpis, configuracion } = await getLostFoundAdmin();
  return (
    <LostFoundAdmin
      categorias={categorias}
      kpis={kpis}
      configuracion={configuracion}
    />
  );
}
