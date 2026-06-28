import {
  isAllowedInstitutionalEmail,
  isAllowedLoginEmail,
} from "@/features/auth/auth.policy";

/**
 * Extrae un mensaje legible del cuerpo de error de FastAPI. `detail` puede ser
 * un string (HTTPException) o un arreglo de errores de validación (422); este
 * helper evita el clásico "[object Object]" al serializar un arreglo/objeto.
 */
function extractApiErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail: unknown }).detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: unknown };
      if (first && typeof first.msg === "string") return first.msg;
    }
  }
  return fallback;
}

type SignInWithPucpSsoOptions = {
  email?: string;
  nextPath: string;
};

type SignInWithWebCredentialsOptions = {
  email: string;
  password: string;
};

export type UpdateCurrentProfileInput = {
  nombre: string;
  apellido: string;
  telefono?: string | null;
  departamento?: string | null;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function startGoogleOauth({
  nextPath,
  institutional,
  email,
}: {
  nextPath: string;
  institutional: boolean;
  email?: string;
}): void {
  const safeNextPath =
    nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/dashboard";
  const loginUrl = new URL(`${API_BASE_URL.replace(/\/$/, "")}/auth/google/login`);
  if (email) {
    loginUrl.searchParams.set("email", email);
  }
  loginUrl.searchParams.set("next", safeNextPath);
  loginUrl.searchParams.set("web_origin", window.location.origin);
  if (!institutional) {
    loginUrl.searchParams.set("institutional", "false");
  }
  window.location.assign(loginUrl.toString());
}

export async function signInWithPucpSso({
  email,
  nextPath,
}: SignInWithPucpSsoOptions): Promise<void> {
  // El correo es opcional: el SSO institucional se inicia directamente desde el
  // botón. Si se provee uno, se valida en cliente como feedback inmediato; el
  // backend es la fuente de verdad y vuelve a validarlo en el callback.
  const normalizedEmail = email?.trim().toLowerCase();
  if (normalizedEmail && !isAllowedLoginEmail(normalizedEmail)) {
    throw new Error("Correo no autorizado para iniciar sesión.");
  }
  startGoogleOauth({ nextPath, institutional: true, email: normalizedEmail });
}

/**
 * Login con Google para cuentas EXTERNAS (no @pucp.edu.pe), desde la pantalla
 * de credenciales. El backend rechaza correos institucionales y no auto-registra
 * cuentas: deben existir y tener rol asignado por el administrador.
 */
export async function signInWithGoogleExternalAccount({
  nextPath,
}: {
  nextPath: string;
}): Promise<void> {
  startGoogleOauth({ nextPath, institutional: false });
}

/**
 * Login web por credenciales (cuentas no institucionales provisionadas por el
 * admin). El backend valida la política rol↔canal (canal=web) y, si procede,
 * establece la cookie HTTP-only `safecampus_session`.
 */
export async function signInWithWebCredentials({
  email,
  password,
}: SignInWithWebCredentialsOptions): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL.replace(/\/$/, "")}/auth/web/credentials/login`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    },
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(
      extractApiErrorMessage(
        payload,
        "No se pudo iniciar sesión con credenciales.",
      ),
    );
  }
}

export async function signOut(): Promise<void> {
  await fetch(`${API_BASE_URL.replace(/\/$/, "")}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

export async function updateCurrentProfile(
  input: UpdateCurrentProfileInput,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/auth/me`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = await response
      .json()
      .catch(() => ({ detail: "No se pudo actualizar el perfil." }));
    throw new Error(payload.detail ?? "No se pudo actualizar el perfil.");
  }
}

export { isAllowedInstitutionalEmail };
