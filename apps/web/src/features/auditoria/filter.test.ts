import { describe, expect, it } from "vitest";

import { AUDITORIA_MOCK } from "./mock-data";
import { filtrarEventosAuditoria } from "./filter";

describe("filtrarEventosAuditoria", () => {
  it("filtra por rango de fechas inclusivo", () => {
    const result = filtrarEventosAuditoria(AUDITORIA_MOCK, {
      busqueda: "",
      tipo: "todos",
      desde: "2026-03-01",
      hasta: "2026-04-10",
    });

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((ev) => ev.timestamp.slice(0, 10) >= "2026-03-01")).toBe(true);
    expect(result.every((ev) => ev.timestamp.slice(0, 10) <= "2026-04-10")).toBe(true);
  });

  it("combina filtro de tipo y texto", () => {
    const result = filtrarEventosAuditoria(AUDITORIA_MOCK, {
      busqueda: "whatsapp",
      tipo: "integracion_verificada",
      desde: null,
      hasta: null,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.tipo).toBe("integracion_verificada");
  });
});
