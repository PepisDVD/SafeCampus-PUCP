import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000/api/v1";

export function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error_code") ?? url.searchParams.get("error");

  if (code) {
    const backendCallbackUrl = new URL(
      `${BACKEND_URL.replace(/\/$/, "")}/auth/google/callback`,
    );
    backendCallbackUrl.searchParams.set("code", code);
    return NextResponse.redirect(backendCallbackUrl);
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", error ?? "oauth_exchange_failed");
  return NextResponse.redirect(loginUrl);
}
