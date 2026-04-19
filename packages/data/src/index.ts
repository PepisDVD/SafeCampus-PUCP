export { createClient as createBrowserClient, supabase } from "./client/client";
export {
  BROWSER_COOKIE_OPTIONS,
  COOKIE_DOMAIN,
  RAW_DOMAIN,
  SERVER_COOKIE_OPTIONS,
  SHARED_COOKIE_OPTIONS,
} from "./client/options";
export { applySupabasePagination } from "./utils/pagination";
export { applySupabaseSearch } from "./utils/search";
export type { Database } from "@safecampus/shared-types";
