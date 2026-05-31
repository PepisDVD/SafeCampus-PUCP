import { Camera } from "expo-camera";

import { usePermission } from "./use-permission";
import type { UsePermissionResult } from "./permission-types";

/** Permiso de cámara — evidencia fotográfica de incidentes (uso pleno en S8). */
export function useCameraPermission(): UsePermissionResult {
  return usePermission(
    Camera.getCameraPermissionsAsync,
    Camera.requestCameraPermissionsAsync,
  );
}
