import { NextResponse } from 'next/server';
import { callBackendWithRefresh } from '@/lib/auth/server';

export async function POST() {
  const result = await callBackendWithRefresh('/auth/onboarding/skip', { method: 'POST', body: {} });
  return NextResponse.json(result.body, { status: result.status });
}
