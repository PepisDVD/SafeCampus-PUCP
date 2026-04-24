"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@safecampus/data";

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

function resolveApiBaseUrl(origin: string): string {
  return process.env.NEXT_PUBLIC_API_URL?.trim() || `${origin}/api/v1`;
}

function toLoginUrl(origin: string, code: string): string {
  const loginUrl = new URL(LOGIN_PATH, origin);
  loginUrl.searchParams.set("error", code);
  return loginUrl.toString();
}

export default function CallbackClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let isCancelled = false;

    const completeAuth = async () => {
      const origin = window.location.origin;
      const code = searchParams.get("code");
      const nextPath = sanitizeNextPath(searchParams.get("next"));

      if (!code) {
        router.replace(toLoginUrl(origin, AUTH_ERROR_OAUTH_MISSING_CODE));
        return;
      }

      const supabase = createBrowserClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        router.replace(toLoginUrl(origin, AUTH_ERROR_OAUTH_EXCHANGE_FAILED));
        return;
      }

      const normalizedEmail = data.user?.email?.trim().toLowerCase() ?? "";
      const isAllowedUser =
        isGoogleProviderUser(data.user) &&
        isAllowedInstitutionalEmail(normalizedEmail);

      if (!isAllowedUser) {
        await supabase.auth.signOut();
        router.replace(toLoginUrl(origin, AUTH_ERROR_DOMAIN_NOT_ALLOWED));
        return;
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        await supabase.auth.signOut();
        router.replace(toLoginUrl(origin, AUTH_ERROR_PROFILE_SYNC_FAILED));
        return;
      }

      const apiBaseUrl = resolveApiBaseUrl(origin).replace(/\/$/, "");
      const syncResponse = await fetch(`${apiBaseUrl}/auth/sync-user`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "User-Agent": navigator.userAgent,
        },
        cache: "no-store",
      }).catch(() => null);

      if (!syncResponse?.ok) {
        await supabase.auth.signOut();
        router.replace(toLoginUrl(origin, AUTH_ERROR_PROFILE_SYNC_FAILED));
        return;
      }

      const targetUrl = new URL(nextPath, origin);
      targetUrl.searchParams.set("auth", "ok");
      if (!isCancelled) {
        router.replace(targetUrl.toString());
      }
    };

    completeAuth().catch(() => {
      router.replace(
        toLoginUrl(window.location.origin, AUTH_ERROR_OAUTH_EXCHANGE_FAILED),
      );
    });

    return () => {
      isCancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="rounded-lg border border-gray-200 bg-white px-6 py-4 text-sm text-gray-600 shadow-sm">
        Completando autenticacion segura...
      </div>
    </main>
  );
}
