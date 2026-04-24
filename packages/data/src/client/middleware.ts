import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import type { Database } from "@safecampus/shared-types";

import { SERVER_COOKIE_OPTIONS } from "./options";

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
              httpOnly: options?.httpOnly ?? true,
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

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (error && error.message !== "Auth session missing!") {
    throw new Error(error.message);
  }

  return { supabaseResponse, user, session, supabase };
}
