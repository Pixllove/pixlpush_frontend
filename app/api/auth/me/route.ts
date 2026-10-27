import { NextResponse } from 'next/server';
import { callBackendWithRefresh, getRefreshToken, getSessionToken } from '@/lib/auth/server';

export async function GET() {
  // A visitor with no session cookies is simply signed out: answer that
  // directly instead of a 401 that makes the client try a pointless refresh.
  if (!getSessionToken() && !getRefreshToken()) return NextResponse.json({ data: { account: null, projects: [] } });
  // Transparently refreshes once if the access token has expired.
  const result = await callBackendWithRefresh('/auth/me');
  return NextResponse.json(result.body, { status: result.status });
}
