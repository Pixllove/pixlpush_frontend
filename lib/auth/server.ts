import 'server-only';
import { cookies, headers as requestHeaders } from 'next/headers';
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

  // Every browser reaches the backend through this server, so without the
  // original address its per-IP auth limits would count all users as one.
  const forwardedFor = requestHeaders().get('x-forwarded-for');
  if (forwardedFor) headers['X-Forwarded-For'] = forwardedFor;

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

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : init.contentType ? String(init.body) : JSON.stringify(init.body),
      cache: 'no-store',
    });
  } catch {
    // Backend unreachable. The reason is deliberately not echoed to the client.
    return {
      ok: false,
      status: 503,
      body: { error: { code: 'BACKEND_UNAVAILABLE', message: 'Service is unavailable. Please try again.' } },
    };
  }

  // The backend answered, so this is never "unavailable". A 204 (DELETE) or any
  // other empty reply has no body; a non-JSON reply (gateway error page) keeps
  // its status with a generic error.
  const text = await response.text().catch(() => '');
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = response.ok ? null : { error: { code: 'UPSTREAM_ERROR', message: 'Unexpected response from the server.' } };
    }
  }
  return { ok: response.ok, status: response.status, body: body as UpstreamResult<T>['body'] };
}

interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

type RefreshResult = UpstreamResult<{ data: SessionTokens }>;

/**
 * Rotations in progress, keyed by the token being exchanged. A page fires
 * several requests at once and each lands in its own route handler with the
 * same expired session; without this every one of them would rotate the same
 * single-use token and all but the first would be refused.
 *
 * A successful result is kept for a few seconds, because a request can still
 * arrive carrying the old cookie before the browser has stored the new pair.
 *
 * Kept on globalThis because each route handler is bundled with its own copy
 * of this module, and /api/auth/me and /api/projects must share one rotation.
 * ponytail: per-process. Across server instances the backend covers the same
 * race by honouring a just-rotated token once more.
 */
const shared = globalThis as typeof globalThis & { __pixlpushRotations?: Map<string, Promise<RefreshResult>> };
const rotations = (shared.__pixlpushRotations ??= new Map<string, Promise<RefreshResult>>());
const ROTATION_REUSE_MS = 10_000;

function rotate(refreshToken: string): Promise<RefreshResult> {
  let pending = rotations.get(refreshToken);
  if (!pending) {
    pending = callBackend<{ data: SessionTokens }>('/auth/refresh', { method: 'POST', body: { refreshToken } });
    rotations.set(refreshToken, pending);
    void pending.then((result) => {
      if (!result.ok) rotations.delete(refreshToken);
      else setTimeout(() => rotations.delete(refreshToken), ROTATION_REUSE_MS).unref?.();
    });
  }
  return pending;
}

/**
 * Exchanges the stored refresh token for a new pair and persists them.
 * Returns undefined when there is no refresh token at all.
 *
 * Only a 401 ends the session. A backend that is down, restarting, rate
 * limiting or mid-deploy says nothing about whether the session is valid, so
 * the cookies are left alone and the next request simply tries again.
 */
export async function refreshSession(): Promise<RefreshResult | undefined> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return undefined;

  const result = await rotate(refreshToken);

  if (result.ok) {
    const tokens = (result.body as { data: SessionTokens }).data;
    setSessionCookies(tokens.accessToken, tokens.refreshToken);
  } else if (result.status === 401) {
    // Expired, revoked or replayed: the session is over.
    clearSessionCookies();
  }
  return result;
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

  const refreshed = await refreshSession();
  if (!refreshed) return first;
  if (!refreshed.ok) {
    // A backend outage or rate limit is reported as itself, so the browser
    // shows "try again" rather than treating the user as signed out.
    const outage = refreshed.status >= 500 || refreshed.status === 429;
    return outage ? (refreshed as UpstreamResult<T>) : first;
  }

  // Retried exactly once; a second 401 is returned as-is.
  return callBackend<T>(path, { ...init, auth: true });
}
