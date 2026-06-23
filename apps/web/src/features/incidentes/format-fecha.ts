const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Formats an incident timestamp identically during SSR and hydration. */
export function formatFechaLima(iso: string | null): string {
  if (!iso) return "Sin fecha";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const limaDate = new Date(date.getTime() - LIMA_OFFSET_MS);
  const hour24 = limaDate.getUTCHours();
  const hour12 = hour24 % 12 || 12;
  const period = hour24 >= 12 ? "p. m." : "a. m.";

  return `${pad(limaDate.getUTCDate())}-${MONTHS[limaDate.getUTCMonth()]}., ${pad(hour12)}:${pad(limaDate.getUTCMinutes())} ${period}`;
}
