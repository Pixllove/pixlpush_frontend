import { NextResponse } from 'next/server';
import { clearSessionCookies, refreshSession } from '@/lib/auth/server';

/**
 * Rotates the session. The browser sends nothing: the refresh token comes from
 * the httpOnly cookie, so JavaScript never handles it.
 */
export async function POST() {
  const result = await refreshSession();

  if (!result) {
    // Also drops a leftover access cookie, which would otherwise keep the
    // middleware bouncing /login back to /dashboard.
    clearSessionCookies();
    return NextResponse.json(
      { error: { code: 'NO_SESSION', message: 'Not signed in.' } },
      { status: 401 },
    );
  }

  if (!result.ok) return NextResponse.json(result.body, { status: result.status });

  // No tokens in the body.
  return NextResponse.json({ data: { refreshed: true } });
}
