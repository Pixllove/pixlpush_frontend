import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'pixlpush_session';

/**
 * Presence of the session cookie gates navigation only. It is not a security
 * boundary: every protected API call is still verified by the backend against
 * the real JWT. This exists to avoid rendering a signed-in shell to a signed-out
 * visitor (and the resulting auth flash).
 */
const PROTECTED = ['/dashboard'];

/** Signed-in users have no reason to see these. */
const AUTH_ONLY = ['/login', '/get-started'];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!hasSession && PROTECTED.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Only the path is preserved, and safeRedirect re-checks it on use.
    url.search = `?redirect=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
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
  matcher: ['/dashboard/:path*', '/login', '/get-started'],
};
