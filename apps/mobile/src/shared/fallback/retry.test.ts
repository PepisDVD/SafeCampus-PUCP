import { afterEach, describe, expect, it, vi } from "vitest";

import { TimeoutError, withRetry, withTimeout } from "./retry";

const retryAll = { isRetryable: () => true };
const retryNone = { isRetryable: () => false };

describe("withRetry", () => {
  afterEach(() => vi.useRealTimers());

  it("no reintenta errores no recuperables (p. ej. 4xx)", async () => {
    const fn = vi.fn(() => Promise.reject(new Error("4xx")));
    await expect(withRetry(fn, { retries: 3, timeoutMs: 50, ...retryNone })).rejects.toThrow("4xx");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("devuelve el valor sin reintentos cuando hay éxito", async () => {
    const fn = vi.fn(() => Promise.resolve("ok"));
    await expect(withRetry(fn, { retries: 3, timeoutMs: 50, ...retryAll })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("reintenta hasta el límite con backoff y luego propaga el último error", async () => {
    vi.useFakeTimers();
    const fn = vi.fn(() => Promise.reject(new Error("5xx")));
    const promise = withRetry(fn, { retries: 2, timeoutMs: 1000, ...retryAll });
    const assertion = expect(promise).rejects.toThrow("5xx");
    await vi.runAllTimersAsync();
    await assertion;
    expect(fn).toHaveBeenCalledTimes(3); // intento inicial + 2 reintentos
  });
});

describe("withTimeout", () => {
  afterEach(() => vi.useRealTimers());

  it("rechaza con TimeoutError si la promesa no resuelve a tiempo", async () => {
    vi.useFakeTimers();
    const promise = withTimeout(new Promise(() => {}), 1000);
    const assertion = expect(promise).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });
});
