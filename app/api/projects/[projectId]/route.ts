import { NextResponse } from 'next/server';
import { callBackendWithRefresh } from '@/lib/auth/server';

/**
 * Active Project context: plan, counts and the caller's role.
 *
 * A Project the account cannot reach comes back as 404, not 403 - the backend
 * does not confirm that someone else's Project exists. Passed through as-is.
 */
export async function GET(_request: Request, { params }: { params: { projectId: string } }) {
  const result = await callBackendWithRefresh(`/projects/${encodeURIComponent(params.projectId)}`);
  return NextResponse.json(result.body, { status: result.status });
}

/** Updates the active Project. Roles owner and admin only, enforced upstream. */
export async function PATCH(request: Request, { params }: { params: { projectId: string } }) {
  const result = await callBackendWithRefresh(`/projects/${encodeURIComponent(params.projectId)}`, {
    method: 'PATCH',
    body: await request.json(),
  });

  return NextResponse.json(result.body, { status: result.status });
}
