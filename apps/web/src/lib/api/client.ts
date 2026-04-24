/**
 * 📁 apps/web/src/lib/api/client.ts
 * 🎯 Cliente HTTP centralizado con interceptores de auth, manejo de errores y tipado.
 * 📦 Capa: Lib / Servicios
 */

import { createBrowserClient } from "@safecampus/data";

const API_BASE_URL =
  typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
    : "/api/v1";

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

const AUTH_SESSION_RETRY_COUNT = 6;
const AUTH_SESSION_RETRY_DELAY_MS = 150;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async resolveBearerToken(forceRefresh = false): Promise<string | null> {
    if (typeof window === "undefined") return null;

    const supabase = createBrowserClient();
    if (forceRefresh) {
      const { data } = await supabase.auth.refreshSession();
      return data.session?.access_token ?? null;
    }

    for (let attempt = 0; attempt < AUTH_SESSION_RETRY_COUNT; attempt += 1) {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? null;
      if (token) return token;
      await sleep(AUTH_SESSION_RETRY_DELAY_MS);
    }

    return null;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, headers: customHeaders, ...restOptions } = options;

    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    let token = await this.resolveBearerToken();

    const buildHeaders = (accessToken: string | null): HeadersInit => ({
      "Content-Type": "application/json",
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      ...customHeaders,
    });

    let response = await fetch(url, { ...restOptions, headers: buildHeaders(token) });

    if (response.status === 401 && typeof window !== "undefined") {
      token = await this.resolveBearerToken(true);
      if (token) {
        response = await fetch(url, { ...restOptions, headers: buildHeaders(token) });
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Error desconocido" }));
      throw new Error(error.detail || `Error ${response.status}`);
    }

    return response.json();
  }

  get<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  post<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: "POST", body: JSON.stringify(body) });
  }

  put<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: "PUT", body: JSON.stringify(body) });
  }

  patch<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: "PATCH", body: JSON.stringify(body) });
  }

  delete<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

export const api = new ApiClient(API_BASE_URL);
