import { NextResponse } from 'next/server';
import { callBackend } from '@/lib/auth/server';

/** Public proxy for the enterprise contact-sales form. */
export async function POST(request: Request) {
  const result = await callBackend('/support/sales-leads', {
    method: 'POST',
    body: await request.json(),
  });

  return NextResponse.json(result.body, { status: result.status });
}
