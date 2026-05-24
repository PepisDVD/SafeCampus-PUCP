import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { getMe, loginOperator } from "../../shared/api/client";
import { mockOperatorUser } from "../../shared/mocks/operator-data";
import type { AuthUser } from "../../shared/types/api";

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  loginWithOperatorEmail: (email: string, password: string) => Promise<void>;
  continueAsDemoOperator: () => void;
  restoreFromToken: (token: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginWithOperatorEmail = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const session = await loginOperator(email, password);
      setToken(session.access_token);
      setUser(session.user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo iniciar sesion.");
    } finally {
      setLoading(false);
    }
  }, []);

  const restoreFromToken = useCallback(async (nextToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const profile = await getMe(nextToken);
      setToken(nextToken);
      setUser(profile);
    } catch (caught) {
      setToken(null);
      setUser(null);
      setError(caught instanceof Error ? caught.message : "Sesion invalida.");
    } finally {
      setLoading(false);
    }
  }, []);

  const continueAsDemoOperator = useCallback(() => {
    setToken("demo-token");
    setUser(mockOperatorUser);
    setError(null);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setError(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      token,
      user,
      loading,
      error,
      loginWithOperatorEmail,
      continueAsDemoOperator,
      restoreFromToken,
      logout,
    }),
    [
      token,
      user,
      loading,
      error,
      loginWithOperatorEmail,
      continueAsDemoOperator,
      restoreFromToken,
      logout,
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
