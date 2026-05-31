import { describe, expect, it, vi } from "vitest";

import { ensurePermission } from "./ensure-permission";
import { normalizePermission } from "./permission-types";

describe("normalizePermission", () => {
  it("mapea granted/undetermined directamente", () => {
    expect(normalizePermission({ status: "granted", canAskAgain: true })).toBe("granted");
    expect(normalizePermission({ status: "undetermined", canAskAgain: true })).toBe("undetermined");
  });

  it("distingue denied (re-solicitable) de blocked (permanente)", () => {
    expect(normalizePermission({ status: "denied", canAskAgain: true })).toBe("denied");
    expect(normalizePermission({ status: "denied", canAskAgain: false })).toBe("blocked");
  });
});

describe("ensurePermission", () => {
  it("usa el estado granted sin solicitar de nuevo", async () => {
    const request = vi.fn();
    await expect(ensurePermission({ state: "granted", request })).resolves.toBe("granted");
    expect(request).not.toHaveBeenCalled();
  });

  it("solicita cuando está undetermined/denied y resuelve según el resultado", async () => {
    const request = vi.fn().mockResolvedValue("granted");
    await expect(ensurePermission({ state: "undetermined", request })).resolves.toBe("granted");
    expect(request).toHaveBeenCalledOnce();
  });

  it("deriva a 'blocked' (Ajustes) y 'unavailable' (alternativa) en FB-PERM", async () => {
    await expect(
      ensurePermission({ state: "blocked", request: vi.fn().mockResolvedValue("blocked") }),
    ).resolves.toBe("blocked");
    await expect(
      ensurePermission({ state: "denied", request: vi.fn().mockResolvedValue("denied") }),
    ).resolves.toBe("unavailable");
  });
});
