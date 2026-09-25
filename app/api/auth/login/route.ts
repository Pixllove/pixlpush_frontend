import { NextResponse } from 'next/server';
import { callBackend, setSessionCookies } from '@/lib/auth/server';

interface LoginData {
  accessToken: string;
  refreshToken: string;
  account: unknown;
}

export async function POST(request: Request) {
  const result = await callBackend<{ data: LoginData }>('/auth/login', {
    method: 'POST',
    body: await request.json(),
  });

  if (!result.ok) return NextResponse.json(result.body, { status: result.status });

  const { accessToken, refreshToken, account } = (result.body as { data: LoginData }).data;
  setSessionCookies(accessToken, refreshToken);

  // Neither token is returned to the browser: both live in httpOnly cookies.
  return NextResponse.json({ data: { account } });
}
