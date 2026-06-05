import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { getMe, loginOperator } from "../../shared/api/client";
import { setActivityHandler, setUnauthorizedHandler } from "../../shared/api/http-client";
import { CONFIG } from "../../shared/config/env";
import { logger } from "../../shared/fallback/logger";
import { mockOperatorUser } from "../../shared/mocks/operator-data";
import type { AuthUser } from "../../shared/types/api";
import type { SessionStatus } from "../../shared/types/session";
import { tokenStore } from "./token-store";
import { useIdleTimeout } from "./use-idle-timeout";

type AuthState = {
  status: SessionStatus;
  user: AuthUser | null;
  token: string | null;
  isDemo: boolean;
  loading: boolean;
  error: string | null;
  loginWithOperatorEmail: (email: string, password: string) => Promise<void>;
  continueAsDemoOperator: () => void;
  logout: () => Promise<void>;
  notifyActivity: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<SessionStatus>("UNKNOWN");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusRef = useRef(status);
  statusRef.current = status;

  const markExpired = useCallback(() => {
    if (statusRef.current !== "AUTHENTICATED") return;
    void tokenStore.clear();
    setToken(null);
    setUser(null);
    setIsDemo(false);
    setStatus("EXPIRED");
  }, []);

  const idleReset = useIdleTimeout({
    enabled: status === "AUTHENTICATED" && !isDemo,
    timeoutMs: CONFIG.SESSION_IDLE_TIMEOUT_MS,
    onTimeout: markExpired,
  });

  // Rehidratación al arranque: el backend es la fuente de verdad (GET /auth/me).
  useEffect(() => {
    (async () => {
      const stored = await tokenStore.get();
      if (!stored) {
        setStatus("UNAUTHENTICATED");
        return;
      }
      try {
        setUser(await getMe(stored));
        setToken(stored);
        setStatus("AUTHENTICATED");
      } catch {
        await tokenStore.clear();
        setStatus("UNAUTHENTICATED");
      }
    })();
  }, []);

  // Un 401 desde cualquier llamada fuerza EXPIRED; una respuesta exitosa reinicia el idle.
  useEffect(() => {
    setUnauthorizedHandler(markExpired);
    setActivityHandler(idleReset);
    return () => {
      setUnauthorizedHandler(null);
      setActivityHandler(null);
    };
  }, [markExpired, idleReset]);

  const loginWithOperatorEmail = useCallback(async (email: string, password: string) => {
    setStatus("AUTHENTICATING");
    setLoading(true);
    setError(null);
    try {
      const session = await loginOperator(email, password);
      await tokenStore.set(session.access_token);
      setToken(session.access_token);
      setUser(session.user);
      setIsDemo(false);
      setStatus("AUTHENTICATED");
    } catch (caught) {
      logger.fallback("FB-AUTH", { reason: "operator-login" });
      setError(caught instanceof Error ? caught.message : "No se pudo iniciar sesión.");
      setStatus("UNAUTHENTICATED");
    } finally {
      setLoading(false);
    }
  }, []);

  const continueAsDemoOperator = useCallback(() => {
    setToken("demo-token");
    setUser(mockOperatorUser);
    setIsDemo(true);
    setError(null);
    setStatus("AUTHENTICATED");
  }, []);

  const logout = useCallback(async () => {
    await tokenStore.clear();
    setToken(null);
    setUser(null);
    setIsDemo(false);
    setError(null);
    setStatus("UNAUTHENTICATED");
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      status,
      user,
      token,
      isDemo,
      loading,
      error,
      loginWithOperatorEmail,
      continueAsDemoOperator,
      logout,
      notifyActivity: idleReset,
    }),
    [
      status,
      user,
      token,
      isDemo,
      loading,
      error,
      loginWithOperatorEmail,
      continueAsDemoOperator,
      logout,
      idleReset,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
