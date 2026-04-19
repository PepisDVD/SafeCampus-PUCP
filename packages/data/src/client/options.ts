import type { CookieOptions } from "@supabase/ssr";

export const RAW_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN ?? "";

export const COOKIE_DOMAIN = RAW_DOMAIN
  ? RAW_DOMAIN.startsWith(".")
    ? RAW_DOMAIN
    : `.${RAW_DOMAIN}`
  : undefined;

export const SHARED_COOKIE_OPTIONS: CookieOptions = {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
  ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
};
