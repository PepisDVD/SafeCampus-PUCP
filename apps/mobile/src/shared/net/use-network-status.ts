import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

/** Conectividad del dispositivo para los flujos de fallback (FB-NET). */
export function useNetworkStatus(): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(
    () => NetInfo.addEventListener((state) => setIsOnline(state.isConnected !== false)),
    [],
  );

  return { isOnline };
}
