/**
 * 📁 apps/web/src/lib/api/server.ts
 * 🎯 Cliente HTTP para Server Components y Server Actions — llama al backend FastAPI.
 * 📦 Capa: Lib / API
 *
 * NO usar en Client Components (no tiene acceso a cookies/localStorage del servidor).
 * Para Client Components usar el `api` client de ./client.ts.
 */

import { cookies } from "next/headers";

const BACKEND_URL =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000/api/v1";

async function request<T>(
  method: string,
  path: string,
  options: { params?: Record<string, string>; body?: unknown } = {},
): Promise<T> {
  const url = new URL(BACKEND_URL + path);
  if (options.params) {
    Object.entries(options.params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    });
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const res = await fetch(url.toString(), {
    method,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    ...(options.body !== undefined && { body: JSON.stringify(options.body) }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `Error ${res.status}` }));
    throw new Error(err.detail ?? `Error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const serverApi = {
  get: <T>(path: string, params?: Record<string, string>) =>
    request<T>("GET", path, { params }),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, { body }),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
