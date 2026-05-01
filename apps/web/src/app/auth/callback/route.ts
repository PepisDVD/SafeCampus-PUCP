import { NextResponse } from "next/server";

export function GET(request: Request) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", "backend_auth_required");
  return NextResponse.redirect(loginUrl);
}
