import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/server";

export default async function PerfilPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login?next=/perfil");
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Perfil</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Informacion de la cuenta autenticada en SafeCampus.
          </p>
        </div>

        <section className="rounded-lg border bg-white p-5">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase text-muted-foreground">
                Nombre
              </dt>
              <dd className="mt-1 text-sm text-slate-900">
                {profile.navUser.name}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-muted-foreground">
                Correo
              </dt>
              <dd className="mt-1 text-sm text-slate-900">
                {profile.navUser.email}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase text-muted-foreground">
                Roles
              </dt>
              <dd className="mt-1 text-sm text-slate-900">
                {profile.roles.length ? profile.roles.join(", ") : "Sin roles"}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}
