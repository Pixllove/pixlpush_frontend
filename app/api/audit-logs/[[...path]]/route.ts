import { NextResponse } from 'next/server';
import { callBackendWithRefresh } from '@/lib/auth/server';

type Params = { params: { path?: string[] } };

/** Account-wide audit feed; the backend limits it to what the caller may see. */
export async function GET(request: Request, { params }: Params) {
  const sub = (params.path ?? []).map(encodeURIComponent).join('/');
  if (sub && sub !== 'filters') return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Not found.' } }, { status: 404 });
  const query = new URL(request.url).search;
  const result = await callBackendWithRefresh(`/audit-logs${sub ? `/${sub}` : ''}${query}`, { method: 'GET' });
  return NextResponse.json(result.body, { status: result.status });
}
