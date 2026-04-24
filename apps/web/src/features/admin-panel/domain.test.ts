import { describe, expect, it } from "vitest";

import type { UsuarioAdmin } from "@/features/usuarios/types";

import { puedeSuspenderUsuario } from "./domain";

const baseAdmin: UsuarioAdmin = {
  id: "U001",
  nombre: "Admin Principal",
  email: "admin@pucp.edu.pe",
  codigo: "A-001",
  departamento: "Seguridad",
  rol: "admin",
  estado: "activo",
  ultimoAcceso: null,
  createdAt: "2026-01-01 10:00",
};

describe("puedeSuspenderUsuario", () => {
  it("bloquea la suspension del ultimo admin activo", () => {
    const result = puedeSuspenderUsuario([baseAdmin], baseAdmin);

    expect(result.ok).toBe(false);
    expect(result.mensaje).toContain("último administrador activo");
  });

  it("permite suspension cuando existe otro admin activo", () => {
    const secondAdmin: UsuarioAdmin = {
      ...baseAdmin,
      id: "U002",
      email: "admin2@pucp.edu.pe",
      codigo: "A-002",
    };

    const result = puedeSuspenderUsuario([baseAdmin, secondAdmin], baseAdmin);

    expect(result.ok).toBe(true);
  });
});
