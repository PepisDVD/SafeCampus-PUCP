import { redirect } from "next/navigation";

import { LostFoundThreadDetail } from "@/features/lost-found/components/lost-found-thread-detail";
import { LfBreadcrumb } from "@/features/lost-found/components/lf-breadcrumb";
import { getLostFoundAccess, getLostFoundThreadDetail, getLostFoundThreadMatches } from "@/features/lost-found/service";
import { serverApi } from "@/lib/api/server";
import { getCurrentUserProfile } from "@/lib/auth/server";
import type { CategoriaLf } from "@/features/lost-found/types";

export default async function LostFoundHiloDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await getLostFoundAccess())) redirect("/dashboard");
  const { id } = await params;
  const [detail, matches, categorias, profile] = await Promise.all([
    getLostFoundThreadDetail(id),
    getLostFoundThreadMatches(id),
    serverApi.get<CategoriaLf[]>("/lost-found/categorias"),
    getCurrentUserProfile(),
  ]);
  return (
    <>
      <LfBreadcrumb
        items={[
          { label: "Lost & Found", href: "/lost-found-operaciones" },
          { label: "Hilos", href: "/lost-found-hilos" },
          { label: detail.codigo },
        ]}
      />
      <LostFoundThreadDetail
        initialCase={detail}
        initialMatches={matches}
        categorias={categorias}
        currentUser={profile ? { id: profile.id, isAdmin: profile.roles.includes("administrador") } : null}
      />
    </>
  );
}
