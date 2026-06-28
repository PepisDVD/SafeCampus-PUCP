import { describe, expect, it } from "vitest";

import { mapAuthError } from "./login.errors";

describe("mapAuthError", () => {
  it("devuelve null cuando no hay error", () => {
    expect(mapAuthError(null)).toBeNull();
  });

  it("mapea acceso_denegado a un mensaje de canal claro", () => {
    const message = mapAuthError("acceso_denegado");
    expect(message).toContain("rol habilitado para la web");
    expect(message).toContain("app movil");
  });

  it("mapea dominio_no_permitido", () => {
    expect(mapAuthError("dominio_no_permitido")).toContain("@pucp.edu.pe");
  });

  it("mapea session_expired", () => {
    expect(mapAuthError("session_expired")).toContain("sesion expiro");
  });

  it("usa un mensaje generico para codigos desconocidos", () => {
    expect(mapAuthError("codigo_inexistente")).toBe(
      "No se pudo iniciar sesion en este momento.",
    );
  });
});
