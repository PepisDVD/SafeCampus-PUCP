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

  let response = await fetch(backendUrl, {
    method: request.method,
    headers,
    cache: "no-store",
    redirect: "manual",
    body,
  });

  if ([301, 302, 303, 307, 308].includes(response.status)) {
    const location = response.headers.get("location");
    if (location) {
      const redirectUrl = new URL(location, backendUrl);
      response = await fetch(redirectUrl, {
        method: request.method,
        headers,
        cache: "no-store",
        redirect: "manual",
        body,
      });
    }
  }

  const responseHeaders = new Headers();
  response.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (!HOP_BY_HOP_HEADERS.has(lowerKey) && lowerKey !== "set-cookie") {
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
