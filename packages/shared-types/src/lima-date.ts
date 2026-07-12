export const LIMA_TIME_ZONE = "America/Lima";
export const LIMA_UTC_OFFSET = "-05:00";
export const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;

export function formatLimaDateTime(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {},
  fallback = "--",
): string {
  if (!value) return fallback;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat("es-PE", {
    timeZone: LIMA_TIME_ZONE,
    ...options,
  }).format(date);
}

export function toLimaDateTimeInputValue(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";

  return new Date(date.getTime() - LIMA_OFFSET_MS).toISOString().slice(0, 16);
}

export function fromLimaDateTimeInputValue(value: string): string {
  if (!value) return "";
  const normalized = value.length === 16 ? `${value}:00` : value;
  const date = new Date(`${normalized}${LIMA_UTC_OFFSET}`);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function toLimaDateInputValue(value: string | Date | null | undefined = new Date()): string {
  return toLimaDateTimeInputValue(value).slice(0, 10);
}

export function fromLimaDateInputValue(value: string, boundary: "start" | "end" = "start"): string {
  if (!value) return "";
  const time = boundary === "end" ? "23:59:59.999" : "00:00:00.000";
  const date = new Date(`${value}T${time}${LIMA_UTC_OFFSET}`);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}
