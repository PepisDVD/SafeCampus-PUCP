import { createServerSupabaseClient } from "@safecampus/data/server";
import { NextResponse } from "next/server";

import {
  AUTH_ERROR_DOMAIN_NOT_ALLOWED,
  AUTH_ERROR_OAUTH_EXCHANGE_FAILED,
  AUTH_ERROR_OAUTH_MISSING_CODE,
  AUTH_ERROR_PROFILE_SYNC_FAILED,
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

function callbackClientFallbackRedirect(
  origin: string,
  code: string,
  nextPath: string,
) {
  const fallbackUrl = new URL("/auth/callback-client", origin);
  fallbackUrl.searchParams.set("code", code);
  fallbackUrl.searchParams.set("next", nextPath);
  return NextResponse.redirect(fallbackUrl);
}

function resolveApiBaseUrl(origin: string): string {
  return process.env.NEXT_PUBLIC_API_URL?.trim() || `${origin}/api/v1`;
}

async function syncAuthenticatedUser(
  origin: string,
  accessToken: string,
  request: Request,
): Promise<boolean> {
  const apiBaseUrl = resolveApiBaseUrl(origin).replace(/\/$/, "");
  const syncUrl = `${apiBaseUrl}/auth/sync-user`;

  const response = await fetch(syncUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Forwarded-For": request.headers.get("x-forwarded-for") ?? "",
      "User-Agent": request.headers.get("user-agent") ?? "",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });

  return response.ok;
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
  let data: Awaited<ReturnType<typeof supabase.auth.exchangeCodeForSession>>["data"] | null = null;
  let error: Awaited<ReturnType<typeof supabase.auth.exchangeCodeForSession>>["error"] | null = null;

  try {
    const result = await supabase.auth.exchangeCodeForSession(code);
    data = result.data;
    error = result.error;
  } catch (exchangeError) {
    console.error("[auth/callback] exchangeCodeForSession threw", exchangeError);
    return callbackClientFallbackRedirect(origin, code, nextPath);
  }

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed", {
      message: error.message,
      code: error.code,
      status: error.status,
    });
    return callbackClientFallbackRedirect(origin, code, nextPath);
  }

  const user = data.user;
  const normalizedEmail = user?.email?.trim().toLowerCase() ?? "";
  const isAllowedUser =
    isGoogleProviderUser(user) && isAllowedInstitutionalEmail(normalizedEmail);

  if (!isAllowedUser) {
    await supabase.auth.signOut();
    return loginRedirectWithError(origin, AUTH_ERROR_DOMAIN_NOT_ALLOWED);
  }

  const accessToken = data.session?.access_token;
  if (!accessToken) {
    await supabase.auth.signOut();
    return loginRedirectWithError(origin, AUTH_ERROR_PROFILE_SYNC_FAILED);
  }

  const syncOk = await syncAuthenticatedUser(origin, accessToken, request).catch(
    () => false,
  );

  if (!syncOk) {
    await supabase.auth.signOut();
    return loginRedirectWithError(origin, AUTH_ERROR_PROFILE_SYNC_FAILED);
  }

  const targetUrl = new URL(nextPath, origin);
  targetUrl.searchParams.set("auth", "ok");
  return NextResponse.redirect(targetUrl);
}
