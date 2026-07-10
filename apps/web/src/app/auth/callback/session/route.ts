import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000/api/v1";

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "safecampus_session";
const ACCESS_TOKEN_EXPIRE_MINUTES = Number(
  process.env.ACCESS_TOKEN_EXPIRE_MINUTES ?? "60",
);

function sanitizeNextPath(rawPath: string | null): string {
  if (!rawPath || rawPath === "/" || !rawPath.startsWith("/") || rawPath.startsWith("//")) {
    return "/dashboard";
  }
  return rawPath;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const handoffToken = url.searchParams.get("handoff");
  const nextPath = sanitizeNextPath(url.searchParams.get("next"));

  if (!handoffToken) {
    return NextResponse.redirect(new URL("/login?error=oauth_exchange_failed", request.url));
  }

  const response = await fetch(
    `${BACKEND_URL.replace(/\/$/, "")}/auth/web/session/exchange`,
    {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handoff_token: handoffToken }),
    },
  ).catch(() => null);

  if (!response?.ok) {
    return NextResponse.redirect(new URL("/login?error=oauth_exchange_failed", request.url));
  }

  const payload = (await response.json()) as { session_token?: string };
  if (!payload.session_token) {
    return NextResponse.redirect(new URL("/login?error=oauth_exchange_failed", request.url));
  }

  const redirectUrl = new URL(nextPath, request.url);
  redirectUrl.searchParams.set("auth", "ok");

  const redirectResponse = NextResponse.redirect(redirectUrl);
  redirectResponse.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: payload.session_token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_EXPIRE_MINUTES * 60,
  });

  return redirectResponse;
}
