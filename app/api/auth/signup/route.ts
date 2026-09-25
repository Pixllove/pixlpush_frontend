import { NextResponse } from 'next/server';
import { callBackend } from '@/lib/auth/server';

/** Pass-through: no session is established or changed by this endpoint. */
export async function POST(request: Request) {
  const result = await callBackend('/auth/signup', {
    method: 'POST',
    body: await request.json(),
  });

  return NextResponse.json(result.body, { status: result.status });
}
