import { NextResponse } from 'next/server';
import { callBackendWithRefresh, setSessionCookies } from '@/lib/auth/server';

interface ChangePasswordData {
  message: string;
  accessToken: string;
  refreshToken: string;
  account: unknown;
}

export async function POST(request: Request) {
  const result = await callBackendWithRefresh<{ data: ChangePasswordData }>('/auth/change-password', {
    method: 'POST',
    body: await request.json(),
  });

  if (!result.ok) return NextResponse.json(result.body, { status: result.status });

  // The change revoked every prior session, including this one. Store the
  // replacement the backend issued so the current tab stays signed in.
  const { accessToken, refreshToken, message } = (result.body as { data: ChangePasswordData }).data;
  setSessionCookies(accessToken, refreshToken);

  return NextResponse.json({ data: { message } });
}
