import { redirect } from "next/navigation";

import { LostFoundThreads } from "@/features/lost-found/components/lost-found-threads";
import { LfBreadcrumb } from "@/features/lost-found/components/lf-breadcrumb";
import { getLostFoundAccess, getLostFoundThreads } from "@/features/lost-found/service";

export default async function LostFoundHilosPage() {
  if (!(await getLostFoundAccess())) redirect("/dashboard");
  const { casos, nextCursor, categorias, ubicaciones } = await getLostFoundThreads();
  return (
    <>
      <LfBreadcrumb
        items={[
          { label: "Lost & Found", href: "/lost-found-operaciones" },
          { label: "Hilos" },
        ]}
      />
      <LostFoundThreads initialCasos={casos} initialNextCursor={nextCursor} categorias={categorias} ubicaciones={ubicaciones} />
    </>
  );
}
