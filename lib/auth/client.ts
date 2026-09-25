import type { ApiError, ApiErrorBody } from '@/types/auth';

/**
 * Browser-side client. It only ever talks to this app's own /api/auth/* route
 * handlers, never to Fastify directly, so the access token stays in an httpOnly
 * cookie that JavaScript cannot read.
 */

function normalizeError(status: number, body: unknown): ApiError {
  const error = (body as ApiErrorBody | undefined)?.error;

  if (!error) {
    return { status, code: 'UNKNOWN', message: 'Something went wrong. Please try again.' };
  }

  // A 422 carries per-field messages; map them onto form field names so
  // react-hook-form can show them next to the right input.
  const fieldErrors = error.details?.reduce<Record<string, string>>((acc, detail) => {
    if (detail.path && !acc[detail.path]) acc[detail.path] = detail.message;
    return acc;
  }, {});

  return {
    status,
    code: error.code,
    message: error.message,
    ...(fieldErrors && Object.keys(fieldErrors).length > 0 ? { fieldErrors } : {}),
  };
}

/**
 * Shared across every in-flight request, so N simultaneous 401s trigger exactly
 * one refresh and all of them await the same result.
 */
let refreshInFlight: Promise<boolean> | null = null;

function refreshOnce(): Promise<boolean> {
  refreshInFlight ??= fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

async function rawRequest(path: string, body?: unknown, base = '/api/auth', method?: string): Promise<Response> {
  return fetch(`${base}${path}`, {
    method: method ?? (body === undefined ? 'GET' : 'POST'),
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    // Same-origin, but explicit so the session cookies are always sent.
    credentials: 'same-origin',
  });
}

/** Paths that must never trigger a refresh, or the retry could recurse. */
const NO_REFRESH = ['/refresh', '/login', '/google', '/logout', '/signup'];

export async function authRequest<T>(path: string, body?: unknown, base?: string, method?: string): Promise<T> {
  let response: Response;

  try {
    response = await rawRequest(path, body, base, method);

    // Retry at most once, and never for the endpoints that establish or end a
    // session - that is what keeps this from looping.
    if (response.status === 401 && !NO_REFRESH.includes(path)) {
      if (await refreshOnce()) response = await rawRequest(path, body, base, method);
    }
  } catch {
    throw { status: 0, code: 'NETWORK_ERROR', message: 'Cannot reach the server. Check your connection.' } satisfies ApiError;
  }

  const payload = await response.json().catch(() => undefined);

  if (!response.ok) throw normalizeError(response.status, payload);

  return (payload as { data: T }).data;
}

/** True for failures that will never succeed on retry. */
export function isPermanentAuthError(error: unknown): boolean {
  const status = (error as ApiError)?.status;
  return status === 400 || status === 401 || status === 403 || status === 409 || status === 422;
}
