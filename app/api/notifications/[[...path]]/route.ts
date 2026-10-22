import { NextResponse } from 'next/server';
import { callBackendStreamWithRefresh, callBackendWithRefresh } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: { path?: string[] } };

function isAllowedPath(path: string[], method: string): boolean {
  if (path.length === 0) return method === 'GET';
  if (path.length === 1 && path[0] === 'stream') return method === 'GET';
  if (path.length === 1 && ['unread-count', 'read-all', 'preferences'].includes(path[0])) {
    if (path[0] === 'read-all') return method === 'POST';
    if (path[0] === 'preferences') return method === 'GET' || method === 'PATCH';
    return method === 'GET';
  }
  return path.length === 2 && ['read', 'dismiss'].includes(path[1]) && method === 'POST';
}

async function proxy(request: Request, { params }: Params) {
  const path = params.path ?? [];
  if (!isAllowedPath(path, request.method)) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Not found.' } }, { status: 404 });
  }

  if (path.length === 1 && path[0] === 'stream') {
    const result = await callBackendStreamWithRefresh('/notifications/stream');
    if (!result.response) {
      return NextResponse.json(
        { error: { code: result.status === 401 ? 'UNAUTHORIZED' : 'BACKEND_UNAVAILABLE', message: 'Unable to open notification stream.' } },
        { status: result.status },
      );
    }
    const headers = new Headers(result.response.headers);
    headers.delete('content-length');
    return new NextResponse(result.response.body, { status: result.status, headers });
  }

  const suffix = path.map(encodeURIComponent).join('/');
  const query = new URL(request.url).search;
  const body = request.method === 'GET' ? undefined : await request.json().catch(() => ({}));
  const result = await callBackendWithRefresh(`/notifications${suffix ? `/${suffix}` : ''}${query}`, {
    method: request.method,
    body,
  });

  if (result.body === null) return new NextResponse(null, { status: result.status });
  return NextResponse.json(result.body, { status: result.status });
}

export { proxy as GET, proxy as POST, proxy as PATCH };
