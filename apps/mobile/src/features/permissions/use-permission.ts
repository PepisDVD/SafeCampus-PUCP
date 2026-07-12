import * as Linking from "expo-linking";
import { useCallback, useEffect, useState } from "react";

import { logger } from "../../shared/fallback/logger";
import {
  normalizePermission,
  type PermissionState,
  type UsePermissionResult,
} from "./permission-types";

type Probe = () => Promise<{ status: string; canAskAgain: boolean }>;

/** Hook genérico de permisos: cada capacidad lo especializa con sus funciones nativas. */
export function usePermission(getStatus: Probe, requestStatus: Probe): UsePermissionResult {
  const [state, setState] = useState<PermissionState>("undetermined");
  const [isReady, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void getStatus()
      .then((response) => {
        if (!active) return;
        setState(normalizePermission(response));
      })
      .catch((error) => {
        logger.error("permission/status", error);
        if (active) setState("denied");
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [getStatus]);

  const request = useCallback(async () => {
    try {
      const next = normalizePermission(await requestStatus());
      setState(next);
      return next;
    } catch (error) {
      logger.error("permission/request", error);
      setState("denied");
      return "denied";
    }
  }, [requestStatus]);

  const openSettings = useCallback(() => Linking.openSettings(), []);

  return { state, request, openSettings, isReady };
}
