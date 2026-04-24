import { updateSession } from "@safecampus/data/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { puedeAccederAdminPanel } from "@/constants/permissions";
import type { RolUsuario } from "@/constants/roles";

function isPublicPath(pathname: string): boolean {
  if (pathname === "/login") return true;
  if (pathname.startsWith("/auth/callback")) return true;
  return false;
}

function isAdminPath(pathname: string): boolean {
  return (
    pathname === "/usuarios" ||
    pathname.startsWith("/usuarios/") ||
    pathname === "/roles" ||
    pathname.startsWith("/roles/") ||
    pathname === "/integraciones" ||
    pathname.startsWith("/integraciones/") ||
    pathname === "/auditoria" ||
    pathname.startsWith("/auditoria/")
  );
}

function normalizeRole(raw: string | null | undefined): RolUsuario | null {
  if (!raw) return null;
  const normalized = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (["admin", "administrador", "administrator"].includes(normalized)) return "admin";
  if (["supervisor"].includes(normalized)) return "supervisor";
  if (["operador", "operator"].includes(normalized)) return "operador";
  if (["comunidad", "community", "usuario", "user"].includes(normalized)) {
    return "comunidad";
  }
  return null;
}

async function resolveUserRoleFromDatabase(
  email: string | undefined,
  supabase: Awaited<ReturnType<typeof updateSession>>["supabase"],
): Promise<RolUsuario | null> {
  if (!email) return null;

  const { data: userRow } = await supabase
    .schema("sc_users")
    .from("usuario")
    .select("id")
    .eq("email", email.toLowerCase())
    .is("deleted_at", null)
    .maybeSingle();

  if (!userRow) return null;

  const { data: roleLinks } = await supabase
    .schema("sc_users")
    .from("usuario_rol")
    .select("rol:rol_id(nombre)")
    .eq("usuario_id", userRow.id);

  if (!roleLinks?.length) return null;

  for (const link of roleLinks) {
    const roleName = (link as { rol?: { nombre?: string } | null }).rol?.nombre;
    const parsed = normalizeRole(roleName);
    if (parsed === "admin") return parsed;
  }

  const first = (roleLinks[0] as { rol?: { nombre?: string } | null }).rol?.nombre;
  return normalizeRole(first);
}

function requestOrigin(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = request.headers.get("host");
  const proto = forwardedProto ?? request.nextUrl.protocol.replace(":", "") ?? "http";
  return `${proto}://${forwardedHost ?? host}${request.nextUrl.pathname}${request.nextUrl.search}`;
}

export async function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-current-url", requestOrigin(request));
  const { supabaseResponse, user, supabase } = await updateSession(request, headers);

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAdminPath(request.nextUrl.pathname)) {
    const metadataRole =
      normalizeRole((user.app_metadata?.role as string | undefined) ?? null) ??
      normalizeRole((user.user_metadata?.role as string | undefined) ?? null);

    const role =
      metadataRole ??
      (await resolveUserRoleFromDatabase(user.email, supabase));

    if (!role || !puedeAccederAdminPanel(role)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "admin_required");
      return NextResponse.redirect(loginUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
