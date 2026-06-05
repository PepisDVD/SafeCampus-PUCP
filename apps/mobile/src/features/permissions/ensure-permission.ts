import { logger } from "../../shared/fallback/logger";
import type { PermissionState } from "./permission-types";

/** Resultado de intentar usar una capacidad protegida por permiso. */
export type PermissionOutcome =
  | "granted" // continuar con la función
  | "blocked" // guiar a Ajustes del sistema (FB-PERM)
  | "unavailable"; // ofrecer alternativa sin la capacidad (FB-PERM)

type Requestable = { state: PermissionState; request: () => Promise<PermissionState> };

/**
 * Patrón de uso contextual: solicita el permiso al usarlo y resuelve el camino.
 * Una denegación nunca bloquea la app; deriva a la ruta de fallback FB-PERM.
 */
export async function ensurePermission(permission: Requestable): Promise<PermissionOutcome> {
  let state = permission.state;
  if (state === "undetermined" || state === "denied") {
    state = await permission.request();
  }
  if (state === "granted") return "granted";

  const outcome: PermissionOutcome = state === "blocked" ? "blocked" : "unavailable";
  logger.fallback("FB-PERM", { outcome });
  return outcome;
}
