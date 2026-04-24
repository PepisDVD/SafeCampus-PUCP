import type { CookieOptions } from "@supabase/ssr";

export const RAW_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN ?? "";

export const COOKIE_DOMAIN = RAW_DOMAIN
  ? RAW_DOMAIN.startsWith(".")
    ? RAW_DOMAIN
    : `.${RAW_DOMAIN}`
  : undefined;

const BASE_COOKIE_OPTIONS: CookieOptions = {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
};

export const BROWSER_COOKIE_OPTIONS: CookieOptions = {
  ...BASE_COOKIE_OPTIONS,
  httpOnly: false,
};

export const SERVER_COOKIE_OPTIONS: CookieOptions = {
  ...BASE_COOKIE_OPTIONS,
  // Supabase browser client needs to read auth cookies to hydrate session.
  httpOnly: false,
};

// Backward compatibility alias.
export const SHARED_COOKIE_OPTIONS: CookieOptions = SERVER_COOKIE_OPTIONS;
