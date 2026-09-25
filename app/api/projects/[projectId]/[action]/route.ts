import { NextResponse } from 'next/server';
import { callBackendWithRefresh } from '@/lib/auth/server';

const ACTIONS = ['deactivate', 'restore'];

/** Deactivates or restores a Project. Owner only, enforced upstream. */
export async function POST(_request: Request, { params }: { params: { projectId: string; action: string } }) {
  if (!ACTIONS.includes(params.action)) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Not found.' } }, { status: 404 });
  }

  // Fastify rejects an empty body sent as application/json, hence `{}`.
  const result = await callBackendWithRefresh(
    `/projects/${encodeURIComponent(params.projectId)}/${params.action}`,
    { method: 'POST', body: {} },
  );

  return NextResponse.json(result.body, { status: result.status });
}
