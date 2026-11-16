import { beforeEach, describe, expect, it, vi } from 'vitest';

const backend = vi.hoisted(() => ({ call: vi.fn() }));
vi.mock('@/lib/auth/server', () => ({ callBackendWithRefresh: backend.call }));

import { DELETE, GET, PATCH, POST } from '@/app/api/projects/[projectId]/[...path]/route';

const params = (...path: string[]) => ({ params: { projectId: 'p1', path } });
const json = (method: string, body?: unknown) =>
  new Request('https://dash.test/api/projects/p1/x?type=popup', { method, ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}) });

beforeEach(() => {
  backend.call.mockReset();
  backend.call.mockResolvedValue({ status: 200, body: { data: { ok: true } } });
});

describe('project API proxy', () => {
  it('forwards Forms routes with method, query and body', async () => {
    const list = await GET(json('GET'), params('forms'));
    expect(list.status).toBe(200);
    expect(backend.call).toHaveBeenLastCalledWith('/projects/p1/forms?type=popup', { method: 'GET', body: undefined, contentType: undefined });

    await PATCH(json('PATCH', { name: 'Spring' }), params('forms', 'f1'));
    expect(backend.call).toHaveBeenLastCalledWith('/projects/p1/forms/f1?type=popup', { method: 'PATCH', body: { name: 'Spring' }, contentType: undefined });

    await POST(json('POST'), params('forms', 'f1', 'activate'));
    expect(backend.call).toHaveBeenLastCalledWith('/projects/p1/forms/f1/activate?type=popup', { method: 'POST', body: {}, contentType: undefined });

    backend.call.mockResolvedValueOnce({ status: 204, body: null });
    expect((await DELETE(json('DELETE'), params('forms', 'f1'))).status).toBe(204);
  });

  it('forwards the Apple Push (APNs) settings routes', async () => {
    await POST(json('POST'), params('apns', 'verify'));
    expect(backend.call).toHaveBeenLastCalledWith('/projects/p1/apns/verify?type=popup', { method: 'POST', body: {}, contentType: undefined });
  });

  it('refuses areas that are not allowed, without calling the backend', async () => {
    const res = await GET(json('GET'), params('not-an-area'));
    expect(res.status).toBe(404);
    expect(backend.call).not.toHaveBeenCalled();
  });

  it('encodes path segments so a segment cannot climb to another route', async () => {
    await GET(json('GET'), params('forms', '../../other'));
    expect(backend.call).toHaveBeenLastCalledWith('/projects/p1/forms/..%2F..%2Fother?type=popup', expect.anything());
  });
});
