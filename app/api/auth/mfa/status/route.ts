import { NextResponse } from 'next/server';
import { callBackendWithRefresh } from '@/lib/auth/server';

export async function GET() {
  const result = await callBackendWithRefresh('/auth/mfa/status');
  return NextResponse.json(result.body, { status: result.status });
}
