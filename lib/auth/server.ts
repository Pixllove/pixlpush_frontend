import 'server-only';
import { cookies } from 'next/headers';
import type { ApiErrorBody } from '@/types/auth';

/**
 * The Fastify backend. Server-side only: the browser never calls it directly,
 * so the access token can live in an httpOnly cookie that JS cannot read.
 */
const API_URL = process.env.BACKEND_API_URL ?? 'http://localhost:3000/api/v1';

export const SESSION_COOKIE = 'pixlpush_session';
export const REFRESH_COOKIE = 'pixlpush_refresh';

/** Matches the backend's JWT_EXPIRES_IN (15m). */
const SESSION_MAX_AGE = 15 * 60;

/** Matches the backend's REFRESH_TOKEN_TTL_DAYS (30d). */
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

const cookieOptions = (maxAge: number) =>
  ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  });

/**
 * Stores both halves of a session. The refresh token is httpOnly like the access
 * token, so no part of the session is reachable from JavaScript.
 */
export function setSessionCookies(accessToken: string, refreshToken?: string): void {
  cookies().set(SESSION_COOKIE, accessToken, cookieOptions(SESSION_MAX_AGE));
  if (refreshToken) cookies().set(REFRESH_COOKIE, refreshToken, cookieOptions(REFRESH_MAX_AGE));
}

export function clearSessionCookies(): void {
  cookies().delete(SESSION_COOKIE);
  cookies().delete(REFRESH_COOKIE);
}

export function getSessionToken(): string | undefined {
  return cookies().get(SESSION_COOKIE)?.value;
}

export function getRefreshToken(): string | undefined {
  return cookies().get(REFRESH_COOKIE)?.value;
}

export interface UpstreamResult<T> {
  ok: boolean;
  status: number;
  body: T | ApiErrorBody;
}

/**
 * One place that calls the backend. Attaches the bearer token when `auth` is
 * set, and never lets an upstream failure surface as an unhandled throw.
 */
export async function callBackend<T>(
  path: string,
  init: { method?: string; body?: unknown; auth?: boolean; contentType?: string } = {},
): Promise<UpstreamResult<T>> {
  // A contentType means a raw text body (CSV user import), forwarded as-is.
  const headers: Record<string, string> = { 'Content-Type': init.contentType ?? 'application/json' };

  if (init.auth) {
    const token = getSessionToken();
    if (!token) {
      return {
        ok: false,
        status: 401,
        body: { error: { code: 'UNAUTHORIZED', message: 'Not signed in.' } },
      };
    }
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : init.contentType ? String(init.body) : JSON.stringify(init.body),
      cache: 'no-store',
    });

    return { ok: response.ok, status: response.status, body: await response.json() };
  } catch {
    // Backend unreachable. The reason is deliberately not echoed to the client.
    return {
      ok: false,
      status: 503,
      body: { error: { code: 'BACKEND_UNAVAILABLE', message: 'Service is unavailable. Please try again.' } },
    };
  }
}

interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Exchanges the stored refresh token for a new pair and persists them.
 * Returns undefined when there is nothing to refresh with, or the backend
 * refused - the caller then treats the request as unauthenticated.
 */
async function refreshSession(): Promise<string | undefined> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return undefined;

  const result = await callBackend<{ data: SessionTokens }>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
  });

  if (!result.ok) {
    // Rotated away, expired, or revoked: the session is over.
    clearSessionCookies();
    return undefined;
  }

  const tokens = (result.body as { data: SessionTokens }).data;
  setSessionCookies(tokens.accessToken, tokens.refreshToken);
  return tokens.accessToken;
}

/**
 * Authenticated call with a single refresh attempt. `callBackend` is used for
 * the refresh itself, so the refresh endpoint can never recurse into this and
 * an expired session costs at most two upstream requests.
 */
export async function callBackendWithRefresh<T>(
  path: string,
  init: { method?: string; body?: unknown; contentType?: string } = {},
): Promise<UpstreamResult<T>> {
  const first = await callBackend<T>(path, { ...init, auth: true });
  if (first.status !== 401) return first;

  const accessToken = await refreshSession();
  if (!accessToken) return first;

  // Retried exactly once; a second 401 is returned as-is.
  return callBackend<T>(path, { ...init, auth: true });
}
