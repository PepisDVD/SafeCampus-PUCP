import { updateSession } from "@safecampus/data/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { puedeAccederAdminPanel } from "@/constants/permissions";
import type { RolUsuario } from "@/constants/roles";

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/.well-known/")) return true;
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

  if (normalized === "administrador") return "admin";
  if (normalized === "supervisor") return "supervisor";
  if (normalized === "operador") return "operador";
  if (normalized === "comunidad") return "comunidad";
  return null;
}

type CurrentRolesResponse = {
  user_id: string;
  email: string;
  roles: string[];
};

function resolveApiBaseUrl(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_API_URL?.trim() || `${request.nextUrl.origin}/api/v1`;
}

async function resolveUserRoleFromBackend(
  request: NextRequest,
  accessToken: string,
): Promise<RolUsuario | null> {
  const apiBaseUrl = resolveApiBaseUrl(request).replace(/\/$/, "");
  const response = await fetch(`${apiBaseUrl}/auth/current-roles`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Forwarded-For": request.headers.get("x-forwarded-for") ?? "",
      "User-Agent": request.headers.get("user-agent") ?? "",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    console.warn("[proxy] current-roles lookup failed", {
      status: response.status,
      statusText: response.statusText,
    });
    return null;
  }

  const payload = (await response.json()) as CurrentRolesResponse;
  if (!Array.isArray(payload.roles) || payload.roles.length === 0) {
    return null;
  }

  for (const roleName of payload.roles) {
    const parsed = normalizeRole(roleName);
    if (parsed === "admin") return parsed;
  }

  const first = payload.roles[0] ?? null;
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
  const { supabaseResponse, user, session } = await updateSession(request, headers);

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAdminPath(request.nextUrl.pathname)) {
    const accessToken = session?.access_token;
    const role = accessToken
      ? await resolveUserRoleFromBackend(request, accessToken)
      : null;

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
    "/((?!api|_next/static|_next/image|favicon.ico|.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
