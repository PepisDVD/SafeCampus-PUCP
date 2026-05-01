const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const { params, headers: customHeaders, ...restOptions } = options;

    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...customHeaders,
    };

    const response = await fetch(url, {
      ...restOptions,
      credentials: "include",
      headers,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Error desconocido" }));
      throw new Error(error.detail || `Error ${response.status}`);
    }

    return response.json();
  }

  get<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  post<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  put<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  patch<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

export const api = new ApiClient(API_BASE_URL);
