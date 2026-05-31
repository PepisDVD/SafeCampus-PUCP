export type PermissionState = "undetermined" | "granted" | "denied" | "blocked";

export interface UsePermissionResult {
  state: PermissionState;
  /** Solicita el permiso y devuelve el nuevo estado normalizado. */
  request: () => Promise<PermissionState>;
  /** Abre los ajustes del sistema (útil cuando el estado es `blocked`). */
  openSettings: () => Promise<void>;
  /** `true` cuando ya se consultó el estado inicial. */
  isReady: boolean;
}

/** Normaliza la respuesta nativa de permisos a nuestros 4 estados. */
export function normalizePermission(response: {
  status: string;
  canAskAgain: boolean;
}): PermissionState {
  if (response.status === "granted") return "granted";
  if (response.status === "undetermined") return "undetermined";
  return response.canAskAgain ? "denied" : "blocked";
}
