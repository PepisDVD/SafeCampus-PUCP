export type FallbackEvent = "FB-NET" | "FB-5XX" | "FB-AUTH" | "FB-401" | "FB-PERM" | "FB-DATA";

const isDev = typeof __DEV__ !== "undefined" && __DEV__;

/** Logger de diagnóstico. Nunca debe recibir datos sensibles (tokens, credenciales). */
export const logger = {
  fallback(event: FallbackEvent, detail?: Record<string, unknown>) {
    if (isDev) console.warn(`[fallback:${event}]`, detail ?? "");
  },
  error(scope: string, error: unknown) {
    if (isDev) console.error(`[${scope}]`, error);
  },
};
