import { getPermissionsAsync, requestPermissionsAsync } from "expo-notifications";

import { usePermission } from "./use-permission";
import type { UsePermissionResult } from "./permission-types";

/** Permiso de notificaciones — alertas push para operadores (uso pleno en S8). */
export function useNotificationPermission(): UsePermissionResult {
  return usePermission(getPermissionsAsync, requestPermissionsAsync);
}
