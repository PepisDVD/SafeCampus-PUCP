import { updateSession } from "@safecampus/data";
import type { NextRequest } from "next/server";

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
  const { supabaseResponse } = await updateSession(request, headers);
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
