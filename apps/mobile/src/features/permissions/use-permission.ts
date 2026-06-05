import * as Linking from "expo-linking";
import { useCallback, useEffect, useState } from "react";

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
    void getStatus().then((response) => {
      if (!active) return;
      setState(normalizePermission(response));
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [getStatus]);

  const request = useCallback(async () => {
    const next = normalizePermission(await requestStatus());
    setState(next);
    return next;
  }, [requestStatus]);

  const openSettings = useCallback(() => Linking.openSettings(), []);

  return { state, request, openSettings, isReady };
}
