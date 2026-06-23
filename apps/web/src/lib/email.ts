/**
 * 📁 apps/web/src/lib/email.ts
 * 🎯 Reglas de validación de correo compartidas por el sistema.
 *    Solo se permiten cuentas institucionales PUCP o Gmail.
 */

/** Dominios habilitados para registrar usuarios en el sistema. */
export const ALLOWED_EMAIL_DOMAINS = ["gmail.com", "pucp.edu.pe"] as const;

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getDomain(email: string): string {
  return email.trim().toLowerCase().split("@").at(-1) ?? "";
}

/** `true` si el correo tiene forma válida y pertenece a un dominio permitido. */
export function isValidInstitutionalEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_SHAPE.test(normalized)) return false;
  return (ALLOWED_EMAIL_DOMAINS as readonly string[]).includes(getDomain(normalized));
}

/** `true` si el correo pertenece al dominio institucional PUCP. */
export function isPucpEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getDomain(email) === "pucp.edu.pe";
}

/** Mensaje de error reutilizable cuando el dominio no está permitido. */
export const EMAIL_DOMAIN_ERROR = `El correo debe pertenecer a un dominio válido (${ALLOWED_EMAIL_DOMAINS.map(
  (d) => `@${d}`,
).join(" o ")}).`;
