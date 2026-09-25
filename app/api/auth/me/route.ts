import { NextResponse } from 'next/server';
import { callBackendWithRefresh } from '@/lib/auth/server';

export async function GET() {
  // Transparently refreshes once if the access token has expired.
  const result = await callBackendWithRefresh('/auth/me');
  return NextResponse.json(result.body, { status: result.status });
}
