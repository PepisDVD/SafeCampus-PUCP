import { describe, expect, it } from "vitest";

import {
  isAllowedInstitutionalEmail,
  isAllowedLoginEmail,
} from "./auth.policy";

describe("isAllowedInstitutionalEmail", () => {
  it("acepta correos @pucp.edu.pe", () => {
    expect(isAllowedInstitutionalEmail("ana.torres@pucp.edu.pe")).toBe(true);
    expect(isAllowedInstitutionalEmail("ANA@PUCP.EDU.PE")).toBe(true);
  });

  it("rechaza otros dominios", () => {
    expect(isAllowedInstitutionalEmail("ana@gmail.com")).toBe(false);
    expect(isAllowedInstitutionalEmail("ana@pucp.edu.pe.evil.com")).toBe(false);
  });
});

describe("isAllowedLoginEmail", () => {
  it("permite institucionales", () => {
    expect(isAllowedLoginEmail("docente@pucp.edu.pe")).toBe(true);
  });

  it("rechaza correos no institucionales fuera de la dev allowlist", () => {
    expect(isAllowedLoginEmail("intruso@hotmail.com")).toBe(false);
  });
});
