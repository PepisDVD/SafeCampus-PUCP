type AuthIdentity = {
  provider?: string | null;
};

type AuthUserShape = {
  app_metadata?: {
    provider?: string | null;
    providers?: unknown;
  } | null;
  identities?: AuthIdentity[] | null;
};

export const ALLOWED_INSTITUTIONAL_DOMAIN = "pucp.edu.pe";

export const AUTH_ERROR_DOMAIN_NOT_ALLOWED = "dominio_no_permitido";
export const AUTH_ERROR_OAUTH_EXCHANGE_FAILED = "oauth_exchange_failed";
export const AUTH_ERROR_OAUTH_MISSING_CODE = "oauth_missing_code";

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isAllowedInstitutionalEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const domainPattern = escapeForRegex(ALLOWED_INSTITUTIONAL_DOMAIN);
  return new RegExp(`^[^\\s@]+@${domainPattern}$`, "i").test(normalized);
}

export function isGoogleProviderUser(
  user: AuthUserShape | null | undefined,
): boolean {
  if (!user) return false;

  const provider = user.app_metadata?.provider;
  if (typeof provider === "string" && provider.toLowerCase() === "google") {
    return true;
  }

  const providers = user.app_metadata?.providers;
  if (
    Array.isArray(providers) &&
    providers.some(
      (currentProvider) =>
        typeof currentProvider === "string" &&
        currentProvider.toLowerCase() === "google",
    )
  ) {
    return true;
  }

  return (
    user.identities?.some(
      (identity: AuthIdentity) =>
        identity.provider?.toLowerCase() === "google",
    ) ?? false
  );
}
