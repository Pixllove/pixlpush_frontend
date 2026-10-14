import { NextResponse } from 'next/server';
import { callBackendWithRefresh } from '@/lib/auth/server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await callBackendWithRefresh('/auth/mfa/recovery-codes/regenerate', { method: 'POST', body });
  return NextResponse.json(result.body, { status: result.status });
}
