import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authRequest } from '@/lib/auth/client';

const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Answers each path from a queue; the last answer repeats. */
function serve(routes: Record<string, Response[]>) {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      calls.push(url);
      const queue = routes[url];
      if (!queue) throw new Error(`unexpected ${url}`);
      return (queue.length > 1 ? queue.shift() : queue[0])!.clone();
    }),
  );
  return calls;
}

const assign = vi.fn();

beforeEach(() => {
  assign.mockClear();
  vi.stubGlobal('location', { pathname: '/dashboard/users', search: '?page=2', assign });
});

afterEach(() => vi.unstubAllGlobals());

describe('authRequest session handling', () => {
  it('refreshes once for simultaneous 401s and retries each request', async () => {
    const calls = serve({
      '/api/auth/me': [json(401), json(401), json(401), json(200, { data: { ok: true } })],
      '/api/auth/refresh': [json(200, { data: { refreshed: true } })],
    });

    const results = await Promise.all([authRequest('/me'), authRequest('/me'), authRequest('/me')]);

    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(calls.filter((c) => c === '/api/auth/refresh')).toHaveLength(1);
    expect(assign).not.toHaveBeenCalled();
  });

  it('sends a dashboard page to login only when the refresh says the session is over', async () => {
    serve({ '/api/auth/me': [json(401)], '/api/auth/refresh': [json(401)] });

    await expect(authRequest('/me')).rejects.toMatchObject({ status: 401 });

    expect(assign).toHaveBeenCalledWith(`/login?redirect=${encodeURIComponent('/dashboard/users?page=2')}`);
  });

  it.each([503, 429, 500])('stays signed in when the refresh fails with %i', async (status) => {
    serve({ '/api/auth/me': [json(401)], '/api/auth/refresh': [json(status)] });
    await expect(authRequest('/me')).rejects.toMatchObject({ status: 401 });
    expect(assign).not.toHaveBeenCalled();
  });

  it.each([403, 500])('does not refresh or sign out on a %i', async (status) => {
    const calls = serve({ '/api/auth/me': [json(status, { error: { code: 'X', message: 'x' } })] });
    await expect(authRequest('/me')).rejects.toMatchObject({ status });
    expect(calls).toEqual(['/api/auth/me']);
    expect(assign).not.toHaveBeenCalled();
  });

  it('leaves a signed-out visitor on a public page where they are', async () => {
    vi.stubGlobal('location', { pathname: '/invitations/accept', search: '', assign });
    serve({ '/api/auth/me': [json(401)], '/api/auth/refresh': [json(401)] });
    await expect(authRequest('/me')).rejects.toMatchObject({ status: 401 });
    expect(assign).not.toHaveBeenCalled();
  });
});
