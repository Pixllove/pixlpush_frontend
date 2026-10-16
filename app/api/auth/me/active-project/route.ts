import { NextResponse } from 'next/server';
import { callBackendWithRefresh } from '@/lib/auth/server';

/** Proxies the account-scoped active Project preference to Fastify. */
export async function PATCH(request: Request) {
  const result = await callBackendWithRefresh('/auth/me/active-project', {
    method: 'PATCH',
    body: await request.json(),
  });

  return NextResponse.json(result.body, { status: result.status });
}
