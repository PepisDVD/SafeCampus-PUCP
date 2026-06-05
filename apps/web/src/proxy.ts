import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000/api/v1";

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "safecampus_session";

const LAYOUT_GUARDED_PREFIXES = [
  "/bienvenida",
  "/inicio",
  "/reportar",
  "/mis-casos",
  "/notificaciones",
  "/lost-found",
  "/dashboard",
  "/incidentes",
  "/mapa",
  "/kpis",
  "/mensajes",
  "/usuarios",
  "/roles",
  "/integraciones",
  "/auditoria",
  "/perfil",
];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/login") return true;
  return false;
}

async function hasBackendSession(request: NextRequest): Promise<boolean> {
  const response = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/auth/me`, {
    headers: {
      cookie: request.headers.get("cookie") ?? "",
    },
    cache: "no-store",
  }).catch(() => null);

  return response?.ok ?? false;
}

function hasSessionCookie(request: NextRequest): boolean {
  return Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

function isLayoutGuardedPath(pathname: string): boolean {
  return LAYOUT_GUARDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const sessionCookiePresent = hasSessionCookie(request);

  if (!sessionCookiePresent) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  if (isLayoutGuardedPath(pathname)) {
    return NextResponse.next();
  }

  const isAuthenticated = await hasBackendSession(request);

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
