import { NextResponse } from 'next/server';
import { callBackendWithRefresh } from '@/lib/auth/server';

/** Proxies the profile's country and time zone preferences to Fastify. */
export async function PATCH(request: Request) {
  const result = await callBackendWithRefresh('/auth/me/preferences', {
    method: 'PATCH',
    body: await request.json(),
  });

  return NextResponse.json(result.body, { status: result.status });
}
