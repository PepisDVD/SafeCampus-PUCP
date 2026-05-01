import { cookies } from "next/headers";
import type { UserNavUser } from "@safecampus/ui-kit";

type UserProfile = {
  id: string;
  roles: string[];
  navUser: UserNavUser;
};

type BackendAuthUser = {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  avatar_url: string | null;
  roles: string[];
};

const BACKEND_URL =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000/api/v1";

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const response = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/auth/me`, {
    headers: {
      cookie: cookieHeader,
    },
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) return null;

  const user = (await response.json()) as BackendAuthUser;

  return {
    id: user.id,
    roles: user.roles,
    navUser: {
      name: `${user.nombre} ${user.apellido}`.trim(),
      email: user.email,
      avatarUrl: user.avatar_url,
    },
  };
}
