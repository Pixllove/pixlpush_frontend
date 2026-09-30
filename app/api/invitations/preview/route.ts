import { NextResponse } from 'next/server';
import { callBackend } from '@/lib/auth/server';

/** Public: invitation details for the accept page. The token is the only input. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  const result = await callBackend(`/invitations/preview?token=${encodeURIComponent(token)}`);
  return NextResponse.json(result.body, { status: result.status });
}
