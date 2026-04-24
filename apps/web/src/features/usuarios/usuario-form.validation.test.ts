import { describe, expect, it } from "vitest";

import { usuarioCrearSchema } from "./components/usuario-form-dialog";

describe("usuarioCrearSchema", () => {
  it("acepta correo institucional @pucp.edu.pe", () => {
    const result = usuarioCrearSchema.safeParse({
      nombre: "Ana Torres Vega",
      email: "ana.torres@pucp.edu.pe",
      codigo: "20201234",
      departamento: "Seguridad Campus",
      rol: "admin",
    });

    expect(result.success).toBe(true);
  });

  it("rechaza correos fuera del dominio PUCP", () => {
    const result = usuarioCrearSchema.safeParse({
      nombre: "Ana Torres Vega",
      email: "ana@gmail.com",
      codigo: "20201234",
      departamento: "Seguridad Campus",
      rol: "admin",
    });

    expect(result.success).toBe(false);
  });
});
