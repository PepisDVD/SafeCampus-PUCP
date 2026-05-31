export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:8000/api/v1";

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Parámetros operativos del cliente; externalizados por ambiente (dev/test/demo). */
export const CONFIG = {
  API_BASE_URL,
  SESSION_IDLE_TIMEOUT_MS: Number(process.env.EXPO_PUBLIC_IDLE_MS ?? 900_000), // 15 min
  HTTP_TIMEOUT_MS: Number(process.env.EXPO_PUBLIC_HTTP_TIMEOUT_MS ?? 15_000),
  HTTP_MAX_RETRIES: Number(process.env.EXPO_PUBLIC_HTTP_MAX_RETRIES ?? 3),
  /** Habilita el atajo "datos demo" del login (solo dev). */
  ALLOW_DEMO_MODE: process.env.EXPO_PUBLIC_ALLOW_DEMO !== "false",
} as const;
