import { afterEach, describe, expect, it, vi } from "vitest";

import { CircuitBreaker, CircuitOpenError } from "./circuit-breaker";

const fail = () => Promise.reject(new Error("boom"));
const ok = () => Promise.resolve("ok");

describe("CircuitBreaker", () => {
  afterEach(() => vi.restoreAllMocks());

  it("abre el circuito tras alcanzar el umbral de fallos", async () => {
    const breaker = new CircuitBreaker({ threshold: 2, cooldownMs: 1000 });
    await expect(breaker.execute(fail)).rejects.toThrow("boom");
    await expect(breaker.execute(fail)).rejects.toThrow("boom");
    // Circuito abierto: corta sin llamar a la dependencia.
    await expect(breaker.execute(fail)).rejects.toBeInstanceOf(CircuitOpenError);
  });

  it("pasa a HALF_OPEN tras el cooldown y se cierra con un éxito", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(0);
    const breaker = new CircuitBreaker({ threshold: 1, cooldownMs: 1000 });
    await expect(breaker.execute(fail)).rejects.toThrow("boom"); // abre
    await expect(breaker.execute(ok)).rejects.toBeInstanceOf(CircuitOpenError);
    now.mockReturnValue(1001); // vence cooldown
    await expect(breaker.execute(ok)).resolves.toBe("ok"); // HALF_OPEN -> CLOSED
    await expect(breaker.execute(ok)).resolves.toBe("ok");
  });

  it("reinicia el conteo de fallos tras un éxito", async () => {
    const breaker = new CircuitBreaker({ threshold: 2, cooldownMs: 1000 });
    await expect(breaker.execute(fail)).rejects.toThrow("boom");
    await expect(breaker.execute(ok)).resolves.toBe("ok"); // resetea
    await expect(breaker.execute(fail)).rejects.toThrow("boom");
    await expect(breaker.execute(ok)).resolves.toBe("ok"); // sigue cerrado
  });
});
