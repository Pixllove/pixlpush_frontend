import { NextResponse } from 'next/server';
import { callBackend, clearSessionCookies, getRefreshToken, setSessionCookies } from '@/lib/auth/server';

interface RefreshData {
  accessToken: string;
  refreshToken: string;
}

/**
 * Rotates the session. The browser sends nothing: the refresh token comes from
 * the httpOnly cookie, so JavaScript never handles it.
 */
export async function POST() {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return NextResponse.json(
      { error: { code: 'NO_SESSION', message: 'Not signed in.' } },
      { status: 401 },
    );
  }

  const result = await callBackend<{ data: RefreshData }>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
  });

  if (!result.ok) {
    // Rotated away, expired or revoked - the session is over.
    clearSessionCookies();
    return NextResponse.json(result.body, { status: result.status });
  }

  const tokens = (result.body as { data: RefreshData }).data;
  setSessionCookies(tokens.accessToken, tokens.refreshToken);

  // No tokens in the body.
  return NextResponse.json({ data: { refreshed: true } });
}
