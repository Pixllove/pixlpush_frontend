import { NextResponse } from 'next/server';
import { callBackend, clearMfaPendingCookie, setMfaPendingCookie, setSessionCookies } from '@/lib/auth/server';

interface LoginData {
  accessToken?: string;
  refreshToken?: string;
  account: unknown;
  mfaRequired?: boolean;
  challengeToken?: string;
}

export async function POST(request: Request) {
  const result = await callBackend<{ data: LoginData }>('/auth/login', {
    method: 'POST',
    body: await request.json(),
  });

  if (!result.ok) return NextResponse.json(result.body, { status: result.status });

  const { accessToken, refreshToken, account, mfaRequired, challengeToken } = (result.body as { data: LoginData }).data;
  if (mfaRequired && challengeToken) {
    setMfaPendingCookie(challengeToken);
    return NextResponse.json({ data: { account, mfaRequired: true } });
  }
  clearMfaPendingCookie();
  if (!accessToken || !refreshToken) return NextResponse.json({ error: { code: 'AUTH_SESSION_INVALID', message: 'Could not start a secure session.' } }, { status: 502 });
  setSessionCookies(accessToken, refreshToken);

  // Neither token is returned to the browser: both live in httpOnly cookies.
  return NextResponse.json({ data: { account } });
}
