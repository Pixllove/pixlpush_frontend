import { NextResponse } from 'next/server';
import { callBackendWithRefresh } from '@/lib/auth/server';

const TOKEN = /^[A-Za-z0-9_-]{43}$/;

/** Signed-in: the Enterprise offer behind an emailed payment link. The backend also checks project membership. */
export async function GET(_request: Request, { params }: { params: { token: string } }) {
  if (!TOKEN.test(params.token)) return NextResponse.json({ error: { code: 'OFFER_LINK_INVALID', message: 'This payment link is not valid.' } }, { status: 404 });
  const result = await callBackendWithRefresh(`/enterprise-offers/${params.token}`);
  return NextResponse.json(result.body, { status: result.status, headers: { 'Cache-Control': 'no-store' } });
}
