import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000/api/v1";

const HOP_BY_HOP_HEADERS = new Set([
  "accept-encoding",
  "connection",
  "content-encoding",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECT_HOPS = 5;

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

async function proxy(request: Request, context: RouteContext) {
  await context.params;
  const incomingUrl = new URL(request.url);
  const proxiedPath = incomingUrl.pathname.slice("/api/backend".length) || "/";
  const backendUrl = new URL(`${BACKEND_URL.replace(/\/$/, "")}${proxiedPath}`);
  backendUrl.search = incomingUrl.search;
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (!HOP_BY_HOP_HEADERS.has(lowerKey)) {
      headers.set(key, value);
    }
  });
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  // Los redirects del backend (p. ej. el 307 de FastAPI por trailing slash) se
  // resuelven aqui, en el servidor. Nunca se devuelve un 3xx ni un `location`
  // al navegador: si lo hicieramos, el navegador seguiria el salto hacia el
  // dominio del backend (cross-origin) y la cookie de sesion httpOnly, que es
  // host-only para este dominio y SameSite=Lax, no viajaria -> 401.
  let response = await fetch(backendUrl, {
    method: request.method,
    headers,
    cache: "no-store",
    redirect: "manual",
    body,
  });

  let currentUrl = backendUrl;
  for (
    let hop = 0;
    hop < MAX_REDIRECT_HOPS && REDIRECT_STATUSES.has(response.status);
    hop += 1
  ) {
    const location = response.headers.get("location");
    if (!location) break;

    const redirectUrl = new URL(location, currentUrl);
    // Railway/Vercel terminan TLS por delante del backend: si este responde con
    // un `Location` en http://, lo forzamos a https para evitar un salto extra.
    if (redirectUrl.protocol === "http:" && currentUrl.protocol === "https:") {
      redirectUrl.protocol = "https:";
    }

    // 303, y 301/302 sobre POST, degradan a GET sin cuerpo (fetch spec).
    const downgradeToGet =
      response.status === 303 ||
      ([301, 302].includes(response.status) && request.method === "POST");

    currentUrl = redirectUrl;
    response = await fetch(redirectUrl, {
      method: downgradeToGet ? "GET" : request.method,
      headers,
      cache: "no-store",
      redirect: "manual",
      body: downgradeToGet ? undefined : body,
    });
  }

  if (REDIRECT_STATUSES.has(response.status)) {
    // Bucle de redirects en el backend: preferimos fallar claro antes que
    // reenviar el 3xx al navegador y provocar un 401 enganoso.
    return NextResponse.json(
      { detail: "El backend no resolvio la peticion (bucle de redirects)." },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  response.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (
      !HOP_BY_HOP_HEADERS.has(lowerKey) &&
      lowerKey !== "set-cookie" &&
      lowerKey !== "location"
    ) {
      responseHeaders.set(key, value);
    }
  });
  const setCookies =
    (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ??
    [];
  if (setCookies.length > 0) {
    setCookies.forEach((cookie) => responseHeaders.append("set-cookie", cookie));
  } else {
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) responseHeaders.set("set-cookie", setCookie);
  }

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
