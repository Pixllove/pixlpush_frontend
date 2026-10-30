import { NextResponse } from 'next/server';
import { callBackendWithRefresh } from '@/lib/auth/server';

/** Submit an account appeal from the signed-in blocked-account screen. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await callBackendWithRefresh('/auth/me/appeal', { method: 'POST', body });
  return NextResponse.json(result.body, { status: result.status });
}
