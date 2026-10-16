import { NextResponse } from 'next/server';
import { callBackendWithRefresh, clearMfaPendingCookie, setSessionCookies } from '@/lib/auth/server';

interface SessionData { accessToken: string; refreshToken: string; account: unknown }

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await callBackendWithRefresh<{ data: SessionData }>('/auth/mfa/disable', { method: 'POST', body });
  if (!result.ok) return NextResponse.json(result.body, { status: result.status });
  const data = (result.body as { data: SessionData }).data;
  setSessionCookies(data.accessToken, data.refreshToken);
  clearMfaPendingCookie();
  return NextResponse.json({ data: { account: data.account } });
}
