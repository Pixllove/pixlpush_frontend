import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'pixlpush_session';
const REFRESH_COOKIE = 'pixlpush_refresh';

/**
 * Presence of a session cookie gates navigation only. The access cookie lasts
 * 15 minutes and the refresh cookie 30 days, so either one counts: a reload
 * after the access token has expired is still a signed-in visit, and the first
 * API call renews it.
 * It is not a security
 * boundary: every protected API call is still verified by the backend against
 * the real JWT. This exists to avoid rendering a signed-in shell to a signed-out
 * visitor (and the resulting auth flash).
 */
const PROTECTED = ['/dashboard'];

/** Signed-in users have no reason to see these. */
const AUTH_ONLY = ['/login', '/get-started'];

/** An unparseable Origin ("null" from a sandboxed frame) is never same-host. */
function sameHost(origin: string, host: string | null): boolean {
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Same values as lib/auth/server.ts, which cannot be imported into middleware. */
const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge,
});
const SESSION_MAX_AGE = 15 * 60;
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

/**
 * A dashboard page requested with only the refresh cookie left: the access
 * token has expired. Renewing it here, before the page renders, lets the layout
 * load the user with the page instead of leaving the browser to refresh and
 * fetch afterwards. Returns undefined to carry on without renewing.
 */
async function renewSession(request: NextRequest, refreshToken: string): Promise<NextResponse | undefined> {
  let upstream: Response;
  try {
    const forwardedFor = request.headers.get('x-forwarded-for');
    upstream = await fetch(`${process.env.BACKEND_API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(forwardedFor ? { 'X-Forwarded-For': forwardedFor } : {}) },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
  } catch {
    return undefined; // Backend unreachable: not evidence of a dead session.
  }

  if (upstream.status === 401) {
    // Expired, revoked or replayed: the session is over.
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?redirect=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
    const response = NextResponse.redirect(url);
    response.cookies.delete(SESSION_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
    return response;
  }
  if (!upstream.ok) return undefined;

  const tokens = ((await upstream.json().catch(() => null)) as { data?: { accessToken: string; refreshToken: string } } | null)?.data;
  if (!tokens) return undefined;

  // On the request, so this render sees the new session; on the response, so the browser keeps it.
  request.cookies.set(SESSION_COOKIE, tokens.accessToken);
  request.cookies.set(REFRESH_COOKIE, tokens.refreshToken);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(SESSION_COOKIE, tokens.accessToken, cookieOptions(SESSION_MAX_AGE));
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, cookieOptions(REFRESH_MAX_AGE));
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith('/api/')) {
    /**
     * The session cookies are SameSite=Lax, which already keeps them off
     * cross-site POSTs. This is the second lock: a state-changing request that
     * names another site as its Origin is refused outright. Requests with no
     * Origin (server-to-server, same-origin GET) are not a browser CSRF vector.
     */
    const origin = request.headers.get('origin');
    const safeMethod = request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS';
    if (!safeMethod && origin && !sameHost(origin, request.headers.get('host'))) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Cross-site request refused.' } },
        { status: 403 },
      );
    }
    return NextResponse.next();
  }

  const hasSession = Boolean(
    request.cookies.get(SESSION_COOKIE)?.value || request.cookies.get(REFRESH_COOKIE)?.value,
  );

  if (!hasSession && PROTECTED.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Only the path is preserved, and safeRedirect re-checks it on use.
    url.search = `?redirect=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (refreshToken && !request.cookies.get(SESSION_COOKIE)?.value && PROTECTED.some((p) => pathname.startsWith(p))) {
    const renewed = await renewSession(request, refreshToken);
    if (renewed) return renewed;
  }

  if (hasSession && AUTH_ONLY.some((p) => pathname === p)) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  /**
   * /reset-password and /verify-email are deliberately absent from AUTH_ONLY:
   * a signed-in user following a reset link must still reach the form.
   */
  matcher: ['/dashboard/:path*', '/login', '/get-started', '/api/:path*'],
};
