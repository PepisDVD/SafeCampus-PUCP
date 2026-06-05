import { getForegroundPermissionsAsync, requestForegroundPermissionsAsync } from "expo-location";

import { usePermission } from "./use-permission";
import type { UsePermissionResult } from "./permission-types";

/** Permiso de ubicación — mapa táctico y acompañamiento (uso pleno en S8). */
export function useLocationPermission(): UsePermissionResult {
  return usePermission(getForegroundPermissionsAsync, requestForegroundPermissionsAsync);
}
