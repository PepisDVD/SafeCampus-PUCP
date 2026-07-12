import { describe, expect, it } from "vitest";
import { EstadoCustodia } from "@safecampus/shared-types";
import { buildReturnedCustodyPdf, buildReturnPdfFilename, buildReturnPdfLines } from "./return-pdf";
import { estadoLfTone, formatDateTimePe } from "./presentation";
import type { CustodiaLf } from "./types";
import { formatLimaDateTime, fromLimaDateTimeInputValue, toLimaDateTimeInputValue } from "@/lib/lima-date";

describe("formatDateTimePe", () => {
  it("formats dates deterministically in the Peru time zone", () => {
    expect(formatDateTimePe("2026-06-25T16:14:00Z")).toBe("25/06/26, 11:14 a. m.");
    expect(formatDateTimePe("2026-06-26T02:05:00Z")).toBe("25/06/26, 09:05 p. m.");
  });

  it("handles invalid dates", () => {
    expect(formatDateTimePe("invalid")).toBe("Fecha no disponible");
  });
});

describe("Lima date helpers", () => {
  it("renders UTC instants and datetime-local values as Lima time", () => {
    const formatted = formatLimaDateTime("2026-07-12T17:50:00Z", {
      hour: "2-digit",
      minute: "2-digit",
    }).replace(/\u00a0/g, " ");

    expect(formatted).toBe("12:50 p. m.");
    expect(toLimaDateTimeInputValue("2026-07-12T17:50:00Z")).toBe("2026-07-12T12:50");
    expect(fromLimaDateTimeInputValue("2026-07-12T12:50")).toBe("2026-07-12T17:50:00.000Z");
  });
});

describe("estadoLfTone", () => {
  it("uses a distinct blue tone for returned custody badges", () => {
    expect(estadoLfTone.DEVUELTA).toContain("bg-blue-50");
    expect(estadoLfTone.DEVUELTA).not.toBe(estadoLfTone.ACTIVA);
  });
});

describe("return PDF helpers", () => {
  const custodia: CustodiaLf = {
    id: "custodia-1",
    caso_id: "caso-1",
    codigo: "LF-2026-001",
    titulo: "Mochila negra",
    estado: EstadoCustodia.DEVUELTA,
    ubicacion_custodia: "Modulo de seguridad",
    observaciones: [
      "Registro de devolucion",
      "Reclamante: Ana Torres (Miembro de la comunidad PUCP)",
      "Detalle de verificacion: Describe correctamente el contenido.",
      "Recepcion confirmada por la persona reclamante.",
    ].join("\n"),
    es_perecible: false,
    fecha_recepcion: "2026-06-25T16:14:00Z",
    fecha_vencimiento: "2026-07-25T16:14:00Z",
    reclamante_id: "user-1",
    metodo_verificacion: "DESCRIPCION_COINCIDENTE",
    fecha_devolucion: "2026-06-26T02:05:00Z",
    created_at: "2026-06-25T16:14:00Z",
    updated_at: "2026-06-26T02:05:00Z",
  };

  it("builds a traceable returned-custody document payload", async () => {
    expect(buildReturnPdfFilename(custodia)).toBe("devolucion-LF-2026-001.pdf");
    expect(buildReturnPdfLines(custodia)).toEqual(expect.arrayContaining([
      "Constancia de devolucion Lost & Found",
      "Persona reclamante",
      "Verificacion",
      "Entrega",
      "Reclamante: Ana Torres (Miembro de la comunidad PUCP)",
      "Recepcion confirmada por la persona reclamante.",
    ]));

    const blob = buildReturnedCustodyPdf(custodia);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(1000);
  });
});
