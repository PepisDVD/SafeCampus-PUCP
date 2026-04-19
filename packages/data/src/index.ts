export { createClient as createBrowserClient, supabase } from "./client/client";
export { createServerSupabaseClient } from "./client/server";
export { updateSession } from "./client/middleware";
export {
  COOKIE_DOMAIN,
  RAW_DOMAIN,
  SHARED_COOKIE_OPTIONS,
} from "./client/options";
export { applySupabasePagination } from "./utils/pagination";
export { applySupabaseSearch } from "./utils/search";
export type { Database } from "@safecampus/shared-types";
