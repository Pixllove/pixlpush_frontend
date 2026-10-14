import { NextResponse } from 'next/server';
import { callBackend, clearMfaPendingCookie, getMfaPendingToken, setSessionCookies } from '@/lib/auth/server';

interface SessionData {
  accessToken: string;
  refreshToken: string;
  account: unknown;
  recoveryUsed: boolean;
}

export async function POST(request: Request) {
  const pendingToken = getMfaPendingToken();
  if (!pendingToken) return NextResponse.json({ error: { code: 'MFA_CHALLENGE_INVALID', message: 'This sign-in request has expired. Start again.' } }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const result = await callBackend<{ data: SessionData }>('/auth/mfa/login/verify', { method: 'POST', body: { ...body, challengeToken: pendingToken } });
  if (!result.ok) return NextResponse.json(result.body, { status: result.status });
  const data = (result.body as { data: SessionData }).data;
  setSessionCookies(data.accessToken, data.refreshToken);
  clearMfaPendingCookie();
  return NextResponse.json({ data: { account: data.account, recoveryUsed: data.recoveryUsed } });
}
