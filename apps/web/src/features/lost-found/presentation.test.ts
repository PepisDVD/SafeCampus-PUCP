import { describe, expect, it } from "vitest";
import { formatDateTimePe } from "./presentation";

describe("formatDateTimePe", () => {
  it("formats dates deterministically in the Peru time zone", () => {
    expect(formatDateTimePe("2026-06-25T16:14:00Z")).toBe("25/06/26, 11:14 a. m.");
    expect(formatDateTimePe("2026-06-26T02:05:00Z")).toBe("25/06/26, 09:05 p. m.");
  });

  it("handles invalid dates", () => {
    expect(formatDateTimePe("invalid")).toBe("Fecha no disponible");
  });
});
