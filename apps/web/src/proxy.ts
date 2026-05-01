import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000/api/v1";

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

export async function proxy(request: NextRequest) {
  const isAuthenticated = await hasBackendSession(request);

  if (!isAuthenticated && !isPublicPath(request.nextUrl.pathname)) {
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
