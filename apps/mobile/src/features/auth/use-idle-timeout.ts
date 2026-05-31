import { useCallback, useEffect, useRef } from "react";

type IdleOptions = { enabled: boolean; timeoutMs: number; onTimeout: () => void };

/** Temporizador de inactividad. Devuelve `reset` para reiniciarlo ante actividad del usuario. */
export function useIdleTimeout({ enabled, timeoutMs, onTimeout }: IdleOptions): () => void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (enabled) timer.current = setTimeout(onTimeout, timeoutMs);
  }, [enabled, timeoutMs, onTimeout]);

  useEffect(() => {
    reset();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [reset]);

  return reset;
}
