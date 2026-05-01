import {
  ALLOWED_INSTITUTIONAL_DOMAIN,
  isAllowedInstitutionalEmail,
} from "@/features/auth/auth.policy";

type SignInWithPucpSsoOptions = {
  email: string;
  nextPath: string;
};

export type UpdateCurrentProfileInput = {
  nombre: string;
  apellido: string;
  telefono?: string | null;
  departamento?: string | null;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function signInWithPucpSso({
  email,
  nextPath,
}: SignInWithPucpSsoOptions): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!isAllowedInstitutionalEmail(normalizedEmail)) {
    throw new Error(
      `Solo se permite el acceso con correos institucionales @${ALLOWED_INSTITUTIONAL_DOMAIN}`,
    );
  }

  const safeNextPath =
    nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/dashboard";
  const loginUrl = new URL(`${API_BASE_URL.replace(/\/$/, "")}/auth/google/login`);
  loginUrl.searchParams.set("email", normalizedEmail);
  loginUrl.searchParams.set("next", safeNextPath);
  window.location.assign(loginUrl.toString());
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
