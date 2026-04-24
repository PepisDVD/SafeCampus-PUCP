import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database as SupabaseDatabase } from "@safecampus/shared-types";

import { SERVER_COOKIE_OPTIONS } from "./options";

export async function createServerSupabaseClient<
  Database = SupabaseDatabase,
>() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: SERVER_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const safeOptions: CookieOptions = {
                ...SERVER_COOKIE_OPTIONS,
                ...options,
                httpOnly:
                  options?.httpOnly ?? SERVER_COOKIE_OPTIONS.httpOnly ?? false,
                sameSite:
                  (options?.sameSite as CookieOptions["sameSite"]) ?? "lax",
              };
              cookieStore.set(name, value, safeOptions);
            });
          } catch {
            // no-op in server components without mutable response context
          }
        },
      },
    },
  );
}
