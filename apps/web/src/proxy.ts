import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000/api/v1";

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "safecampus_session";
const AUTH_CHECK_TIMEOUT_MS = 3000;
type AuthCheckResult = "authenticated" | "unauthenticated" | "unknown";

function isPublicPath(pathname: string): boolean {
  // Toda la zona de login (incluida la pantalla de credenciales) es pública.
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;
  if (pathname === "/auth/callback" || pathname.startsWith("/auth/callback/")) {
    return true;
  }
  return false;
}

async function checkBackendSession(request: NextRequest): Promise<AuthCheckResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AUTH_CHECK_TIMEOUT_MS);
  const response = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/auth/me`, {
    headers: {
      cookie: request.headers.get("cookie") ?? "",
    },
    cache: "no-store",
    signal: controller.signal,
  }).catch(() => null);
  clearTimeout(timeout);

  if (!response) return "unknown";
  if (response.ok) return "authenticated";
  if (response.status === 401 || response.status === 403) return "unauthenticated";
  return "unknown";
}

function hasSessionCookie(request: NextRequest): boolean {
  return Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname === "/" &&
    (request.nextUrl.searchParams.has("code") ||
      request.nextUrl.searchParams.has("error") ||
      request.nextUrl.searchParams.has("error_code"))
  ) {
    return NextResponse.next();
  }

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

  const authStatus = await checkBackendSession(request);

  if (authStatus === "unauthenticated") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "session_expired");
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  // Si la cookie existe pero el backend no respondio a tiempo, no hacemos logout
  // desde el proxy. Los layouts vuelven a validar la sesion con un timeout mayor.
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Excluye assets estáticos y archivos PWA (manifest.webmanifest, sw.js, etc.)
    // para que el guard de sesión no los redirija a /login y rompa su parseo.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest|js|json|txt|woff|woff2|ttf)$).*)",
  ],
};
