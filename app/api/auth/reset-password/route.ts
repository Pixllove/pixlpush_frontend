import { NextResponse } from 'next/server';
import { callBackend, clearSessionCookies } from '@/lib/auth/server';

export async function POST(request: Request) {
  const result = await callBackend('/auth/reset-password', {
    method: 'POST',
    body: await request.json(),
  });

  // A successful reset revokes every existing session, so any cookies this
  // browser still holds are now dead weight.
  if (result.ok) clearSessionCookies();

  return NextResponse.json(result.body, { status: result.status });
}
