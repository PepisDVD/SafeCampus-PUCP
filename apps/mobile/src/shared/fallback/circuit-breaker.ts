export class CircuitOpenError extends Error {
  constructor() {
    super("Servicio temporalmente no disponible.");
  }
}

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

/**
 * Suspende llamadas a una dependencia que falla de forma reiterada y se auto-recupera.
 * CLOSED → OPEN (corta) → HALF_OPEN (prueba) → CLOSED.
 */
export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failures = 0;
  private openedAt = 0;

  constructor(private readonly opts: { threshold: number; cooldownMs: number }) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.openedAt < this.opts.cooldownMs) throw new CircuitOpenError();
      this.state = "HALF_OPEN";
    }
    try {
      const result = await fn();
      this.failures = 0;
      this.state = "CLOSED";
      return result;
    } catch (error) {
      if (++this.failures >= this.opts.threshold) {
        this.state = "OPEN";
        this.openedAt = Date.now();
      }
      throw error;
    }
  }
}
