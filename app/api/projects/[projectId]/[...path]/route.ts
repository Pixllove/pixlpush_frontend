import { NextResponse } from 'next/server';
import { callBackendWithRefresh } from '@/lib/auth/server';

/** Project-scoped backend areas this proxy may reach. Anything else is a 404. */
const ALLOWED = ['deactivate', 'restore', 'firebase', 'sdk-keys', 'email-settings'];

type Params = { params: { projectId: string; path: string[] } };

/** Forwards to /projects/:projectId/<path>. Roles are enforced upstream. */
async function proxy(request: Request, { params }: Params) {
  if (!ALLOWED.includes(params.path[0])) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Not found.' } }, { status: 404 });
  }

  const path = [params.projectId, ...params.path].map(encodeURIComponent).join('/');
  // Fastify rejects an empty body sent as application/json, hence `{}`.
  const body = request.method === 'GET' ? undefined : await request.json().catch(() => ({}));

  const result = await callBackendWithRefresh(`/projects/${path}`, { method: request.method, body });
  return NextResponse.json(result.body, { status: result.status });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE };
