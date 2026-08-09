import type { NextRequest } from 'next/server';

/**
 * Same-origin proxy to the API.
 *
 * This deliberately does *not* use a Next.js `rewrite`. Rewrite destinations
 * are resolved at build time and baked into routes-manifest.json, so a
 * container built once could never be pointed at a different API host — the
 * runtime API_URL is simply ignored. Reading it per request here keeps one
 * image usable across environments.
 *
 * Going through the same origin also means the better-auth session cookie is
 * first-party for the browser, so no CORS configuration is involved.
 */
const apiUrl = () => process.env.API_URL ?? 'http://localhost:3001';

// Headers that describe the *hop*, not the payload — forwarding them corrupts
// the proxied request/response.
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
  'content-encoding',
]);

function filterHeaders(source: Headers): Headers {
  const result = new Headers();
  source.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) result.append(key, value);
  });
  return result;
}

async function proxy(request: NextRequest, path: string[]): Promise<Response> {
  const target = new URL(`${apiUrl()}/${path.join('/')}`);
  target.search = request.nextUrl.search;

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  const upstream = await fetch(target, {
    method: request.method,
    headers: filterHeaders(request.headers),
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: 'manual',
    cache: 'no-store',
  });

  const responseHeaders = filterHeaders(upstream.headers);
  // Set-Cookie can legitimately repeat (better-auth clears three cookies on
  // logout); forEach above collapses them, so re-add them individually.
  responseHeaders.delete('set-cookie');
  for (const cookie of upstream.headers.getSetCookie()) {
    responseHeaders.append('set-cookie', cookie);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

type Context = { params: Promise<{ path: string[] }> };

async function handler(request: NextRequest, context: Context): Promise<Response> {
  const { path } = await context.params;
  return proxy(request, path);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const HEAD = handler;
export const OPTIONS = handler;

// The proxy must never be statically evaluated or cached.
export const dynamic = 'force-dynamic';
