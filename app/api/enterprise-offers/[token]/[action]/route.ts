import { NextResponse } from 'next/server';
import { callBackendWithRefresh } from '@/lib/auth/server';

const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const ACTIONS = new Set(['preview', 'subscribe', 'confirm']);

/** Signed-in: tax preview, payment start and post-payment confirm for an emailed Enterprise offer link. */
export async function POST(request: Request, { params }: { params: { token: string; action: string } }) {
  if (!TOKEN.test(params.token) || !ACTIONS.has(params.action)) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Not found.' } }, { status: 404 });
  const result = await callBackendWithRefresh(`/enterprise-offers/${params.token}/${params.action}`, { method: 'POST', body: await request.json().catch(() => ({})) });
  return NextResponse.json(result.body, { status: result.status, headers: { 'Cache-Control': 'no-store' } });
}
