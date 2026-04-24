import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import type { Database } from "@safecampus/shared-types";

import { SERVER_COOKIE_OPTIONS } from "./options";

function isTransientAuthNetworkError(message: string | undefined): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes("fetch failed") ||
    normalized.includes("timeout") ||
    normalized.includes("network")
  );
}

export async function updateSession(request: NextRequest, headers?: Headers) {
  let supabaseResponse = NextResponse.next({
    request,
    headers,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: SERVER_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({ request, headers });

          cookiesToSet.forEach(({ name, value, options }) => {
            const safeOptions: CookieOptions = {
              ...SERVER_COOKIE_OPTIONS,
              ...options,
              secure:
                options?.secure ?? process.env.NODE_ENV === "production",
              httpOnly:
                options?.httpOnly ?? SERVER_COOKIE_OPTIONS.httpOnly ?? false,
              sameSite:
                (options?.sameSite as CookieOptions["sameSite"]) ?? "lax",
              path: options?.path ?? "/",
            };
            supabaseResponse.cookies.set(name, value, safeOptions);
          });
        },
      },
    },
  );

  let user = null;
  let session = null;

  let error: { message?: string } | null = null;

  try {
    const {
      data: { user: resolvedUser },
      error: resolvedError,
    } = await supabase.auth.getUser();
    user = resolvedUser;
    error = resolvedError;
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch failed";
    if (isTransientAuthNetworkError(message)) {
      console.warn("[updateSession] transient getUser network error", { message });
      return { supabaseResponse, user: null, session: null, supabase };
    }
    throw err;
  }

  try {
    const {
      data: { session: resolvedSession },
    } = await supabase.auth.getSession();
    session = resolvedSession;
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch failed";
    if (isTransientAuthNetworkError(message)) {
      console.warn("[updateSession] transient getSession network error", {
        message,
      });
      return { supabaseResponse, user: null, session: null, supabase };
    }
    throw err;
  }

  if (error && error.message !== "Auth session missing!") {
    if (isTransientAuthNetworkError(error.message)) {
      console.warn("[updateSession] transient auth network error", {
        message: error.message,
      });
      return { supabaseResponse, user: null, session: null, supabase };
    }
    throw new Error(error.message);
  }

  return { supabaseResponse, user, session, supabase };
}
