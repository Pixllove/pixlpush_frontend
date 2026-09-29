import { NextResponse } from 'next/server';
import { callBackend, getSessionToken, setSessionCookies } from '@/lib/auth/server';

interface AcceptData {
  account: unknown;
  project: unknown;
  accessToken?: string;
  refreshToken?: string;
}

/**
 * Signed in: accept as the current account. New account: the backend returns
 * a session, which is stored in httpOnly cookies and never sent to the browser.
 */
export async function POST(request: Request) {
  const signedIn = Boolean(getSessionToken());
  const result = await callBackend<{ data: AcceptData }>('/invitations/accept', {
    method: 'POST',
    body: await request.json(),
    auth: signedIn,
  });
  if (!result.ok) return NextResponse.json(result.body, { status: result.status });

  const { accessToken, refreshToken, account, project } = (result.body as { data: AcceptData }).data;
  if (accessToken) setSessionCookies(accessToken, refreshToken);
  return NextResponse.json({ data: { account, project } });
}
