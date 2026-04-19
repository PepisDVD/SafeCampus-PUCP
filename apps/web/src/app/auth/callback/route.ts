import { createServerSupabaseClient } from "@safecampus/data/server";
import { NextResponse } from "next/server";

import {
  AUTH_ERROR_DOMAIN_NOT_ALLOWED,
  AUTH_ERROR_OAUTH_EXCHANGE_FAILED,
  AUTH_ERROR_OAUTH_MISSING_CODE,
  isAllowedInstitutionalEmail,
  isGoogleProviderUser,
} from "@/features/auth/auth.policy";

const LOGIN_PATH = "/login";
const DEFAULT_REDIRECT_PATH = "/dashboard";

function sanitizeNextPath(rawPath: string | null): string {
  if (!rawPath) return DEFAULT_REDIRECT_PATH;
  if (rawPath === "/") return DEFAULT_REDIRECT_PATH;
  if (!rawPath.startsWith("/") || rawPath.startsWith("//")) {
    return DEFAULT_REDIRECT_PATH;
  }
  return rawPath;
}

function loginRedirectWithError(origin: string, code: string) {
  const loginUrl = new URL(LOGIN_PATH, origin);
  loginUrl.searchParams.set("error", code);
  return NextResponse.redirect(loginUrl);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const code = requestUrl.searchParams.get("code");
  const nextPath = sanitizeNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return loginRedirectWithError(origin, AUTH_ERROR_OAUTH_MISSING_CODE);
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed", {
      message: error.message,
      code: error.code,
      status: error.status,
    });
    return loginRedirectWithError(origin, AUTH_ERROR_OAUTH_EXCHANGE_FAILED);
  }

  const user = data.user;
  const normalizedEmail = user?.email?.trim().toLowerCase() ?? "";
  const isAllowedUser =
    isGoogleProviderUser(user) && isAllowedInstitutionalEmail(normalizedEmail);

  if (!isAllowedUser) {
    await supabase.auth.signOut();
    return loginRedirectWithError(origin, AUTH_ERROR_DOMAIN_NOT_ALLOWED);
  }

  const targetUrl = new URL(nextPath, origin);
  targetUrl.searchParams.set("auth", "ok");
  return NextResponse.redirect(targetUrl);
}
