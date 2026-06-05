export class TimeoutError extends Error {
  constructor() {
    super("La operación excedió el tiempo de espera.");
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), ms));

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError()), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

type RetryOptions = {
  retries: number;
  timeoutMs: number;
  isRetryable: (error: unknown) => boolean;
};

/** Reintenta `fn` con backoff exponencial (tope 8s). Solo reintenta lo que `isRetryable` aprueba. */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      return await withTimeout(fn(), opts.timeoutMs);
    } catch (error) {
      lastErr = error;
      if (!opts.isRetryable(error) || attempt === opts.retries) break;
      await sleep(Math.min(1000 * 2 ** attempt, 8000));
    }
  }
  throw lastErr;
}
