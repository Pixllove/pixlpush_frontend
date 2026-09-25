import { NextResponse } from 'next/server';
import { callBackend, clearSessionCookies, getRefreshToken } from '@/lib/auth/server';

/**
 * Revokes the refresh token server-side, then drops both cookies. The backend
 * always reports success, so a missing or stale token still logs out cleanly.
 */
export async function POST() {
  const refreshToken = getRefreshToken();

  if (refreshToken) {
    await callBackend('/auth/logout', { method: 'POST', body: { refreshToken } });
  }

  clearSessionCookies();
  return NextResponse.json({ data: { message: 'Signed out.' } });
}
