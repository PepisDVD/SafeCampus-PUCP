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
const SERVER_FETCH_TIMEOUT_MS = 20000;

type ServerApiRequestOptions = {
  params?: Record<string, string>;
  body?: unknown;
  cache?: RequestCache;
  revalidate?: number;
  tags?: string[];
};

async function request<T>(
  method: string,
  path: string,
  options: ServerApiRequestOptions = {},
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

  const isGet = method === "GET";
  const cacheMode = options.cache ?? "no-store";
  const shouldUseNextOptions =
    isGet && cacheMode !== "no-store" &&
    (typeof options.revalidate === "number" ||
      (Array.isArray(options.tags) && options.tags.length > 0));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SERVER_FETCH_TIMEOUT_MS);
  const res = await fetch(url.toString(), {
    method,
    cache: cacheMode,
    signal: controller.signal,
    ...(shouldUseNextOptions
      ? {
          next: {
            ...(typeof options.revalidate === "number"
              ? { revalidate: options.revalidate }
              : {}),
            ...(Array.isArray(options.tags) && options.tags.length > 0
              ? { tags: options.tags }
              : {}),
          },
        }
      : {}),
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    ...(options.body !== undefined && { body: JSON.stringify(options.body) }),
  }).finally(() => clearTimeout(timeout));

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `Error ${res.status}` }));
    const detail =
      typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail ?? err);
    throw new Error(`${method} ${path} -> ${res.status}: ${detail}`);
  }

  return res.json() as Promise<T>;
}

export const serverApi = {
  get: <T>(
    path: string,
    params?: Record<string, string>,
    options?: Omit<ServerApiRequestOptions, "params" | "body">,
  ) => request<T>("GET", path, { params, ...options }),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, { body }),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
