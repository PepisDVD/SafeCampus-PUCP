import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@safecampus/shared-types";

import { BROWSER_COOKIE_OPTIONS } from "./options";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: BROWSER_COOKIE_OPTIONS,
    },
  );
}

export const supabase = createClient();
