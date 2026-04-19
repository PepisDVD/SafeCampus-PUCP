import { updateSession } from "@safecampus/data/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function isPublicPath(pathname: string): boolean {
  if (pathname === "/login") return true;
  if (pathname.startsWith("/auth/callback")) return true;
  return false;
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
  const { supabaseResponse, user } = await updateSession(request, headers);

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
