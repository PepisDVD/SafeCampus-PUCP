import { CONFIG } from "../config/env";
import { CircuitBreaker, CircuitOpenError } from "../fallback/circuit-breaker";
import { logger } from "../fallback/logger";
import { TimeoutError, withRetry } from "../fallback/retry";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

/** Error transitorio del servidor (5xx); habilita reintento. */
class ServerError extends Error {
  constructor(public readonly status: number) {
    super(`Server error ${status}`);
  }
}

// Handlers de sesión, registrados por el AuthProvider para evitar dependencias circulares.
let onUnauthorized: (() => void) | null = null;
let onActivity: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => (onUnauthorized = fn);
export const setActivityHandler = (fn: (() => void) | null) => (onActivity = fn);

const breaker = new CircuitBreaker({ threshold: 5, cooldownMs: 30_000 });

const isRetryable = (error: unknown) =>
  error instanceof ServerError || error instanceof TimeoutError || error instanceof TypeError;

type RequestOptions = {
  token?: string | null;
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
};

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await breaker.execute(() =>
      withRetry(
        async () => {
          const res = await fetch(`${CONFIG.API_BASE_URL}${path}`, {
            method: options.method ?? "GET",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
            },
            body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
          });
          if (res.status >= 500) throw new ServerError(res.status);
          return res;
        },
        { retries: CONFIG.HTTP_MAX_RETRIES, timeoutMs: CONFIG.HTTP_TIMEOUT_MS, isRetryable },
      ),
    );
  } catch (error) {
    if (error instanceof CircuitOpenError) {
      logger.fallback("FB-5XX", { path, reason: "circuit-open" });
      throw new ApiError(error.message, 503);
    }
    if (error instanceof ServerError) {
      logger.fallback("FB-5XX", { path, status: error.status });
      throw new ApiError("El servicio no está disponible. Intenta más tarde.", error.status);
    }
    logger.fallback("FB-NET", { path });
    throw new ApiError("Sin conexión con el servidor.", 0);
  }

  if (response.status === 401) {
    logger.fallback("FB-401", { path });
    onUnauthorized?.();
    throw new ApiError("Sesión expirada. Vuelve a ingresar.", 401);
  }
  if (!response.ok) throw await toApiError(response);

  onActivity?.();
  return (await response.json()) as T;
}

async function toApiError(response: Response): Promise<ApiError> {
  let message = "No se pudo completar la operación.";
  try {
    const payload = (await response.json()) as { detail?: string };
    message = payload.detail ?? message;
  } catch {
    // Mantener mensaje genérico si el cuerpo no es JSON.
  }
  return new ApiError(message, response.status);
}
