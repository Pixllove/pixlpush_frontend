import { NextResponse } from 'next/server';
import { callBackendWithRefresh } from '@/lib/auth/server';

/** Project-scoped backend areas this proxy may reach. Anything else is a 404. */
const ALLOWED = ['deactivate', 'restore', 'firebase', 'sdk-keys', 'email-settings', 'users', 'lifecycle-segments', 'user-imports', 'audience-groups'];

type Params = { params: { projectId: string; path: string[] } };

/** Forwards to /projects/:projectId/<path>. Roles are enforced upstream. */
async function proxy(request: Request, { params }: Params) {
  if (!ALLOWED.includes(params.path[0])) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Not found.' } }, { status: 404 });
  }

  const path = [params.projectId, ...params.path].map(encodeURIComponent).join('/');
  const query = new URL(request.url).search;
  // A CSV upload is forwarded as raw text with its own content type.
  const type = request.headers.get('content-type') ?? '';
  const csvType = type && !type.includes('json') ? type : undefined;
  // Fastify rejects an empty body sent as application/json, hence `{}`.
  const body =
    request.method === 'GET' ? undefined : csvType ? await request.text() : await request.json().catch(() => ({}));

  const result = await callBackendWithRefresh(`/projects/${path}${query}`, {
    method: request.method,
    body,
    contentType: csvType,
  });
  return NextResponse.json(result.body, { status: result.status });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE };
