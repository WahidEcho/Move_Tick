import { NextResponse } from 'next/server';

/**
 * CORS for the /api/mobile/* routes. The Flutter app runs as a native binary
 * (no CORS) in production, but development/testing uses `flutter run -d
 * chrome`, where the browser enforces CORS — without these headers every call
 * dies with "ClientException: Failed to fetch". Auth stays Bearer-token based
 * (no cookies), so a wildcard origin is safe here.
 */
export const MOBILE_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

/** JSON response with mobile CORS headers attached. */
export function corsJson(data: unknown, init?: { status?: number }): NextResponse {
  return NextResponse.json(data, { status: init?.status ?? 200, headers: MOBILE_CORS_HEADERS });
}

/** Preflight response for OPTIONS handlers. */
export function optionsResponse(): Response {
  return new Response(null, { status: 204, headers: MOBILE_CORS_HEADERS });
}
