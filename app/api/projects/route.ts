import { NextResponse } from 'next/server';
import { callBackendWithRefresh } from '@/lib/auth/server';

/** Projects the signed-in account is a member of, each with the caller's role. */
export async function GET() {
  const result = await callBackendWithRefresh('/projects');
  return NextResponse.json(result.body, { status: result.status });
}

/** Creates a Project; the caller becomes its owner. 201 on success. */
export async function POST(request: Request) {
  const result = await callBackendWithRefresh('/projects', {
    method: 'POST',
    body: await request.json(),
  });

  return NextResponse.json(result.body, { status: result.status });
}
