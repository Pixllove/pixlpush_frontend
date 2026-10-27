import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  cookies: () => ({ get: mocks.get, set: mocks.set, delete: mocks.delete }),
  headers: () => new Headers(),
}));

import { clearAccountSessionCookies, clearSessionCookies, refreshSession, REFRESH_COOKIE, SESSION_COOKIE } from '@/lib/auth/server';
import { SUPPORT_GUEST_COOKIE } from '@/lib/support/cookies';

describe('PixlPush support capability across session expiry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockImplementation((name: string) => name === REFRESH_COOKIE ? { value: 'expired-refresh-for-test' } : undefined);
  });

  it('clears account cookies without deleting the separate guest support capability', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'Session ended.' } }), { status: 401 })));

    const result = await refreshSession();

    expect(result?.status).toBe(401);
    expect(mocks.delete).toHaveBeenCalledWith(SESSION_COOKIE);
    expect(mocks.delete).toHaveBeenCalledWith(REFRESH_COOKIE);
    expect(mocks.delete).not.toHaveBeenCalledWith(SUPPORT_GUEST_COOKIE);
  });

  it('still clears the guest capability on an explicit account transition', () => {
    clearSessionCookies();

    expect(mocks.delete).toHaveBeenCalledWith(SESSION_COOKIE);
    expect(mocks.delete).toHaveBeenCalledWith(REFRESH_COOKIE);
    expect(mocks.delete).toHaveBeenCalledWith(SUPPORT_GUEST_COOKIE);
  });

  it('can clear account credentials alone when there is no refresh session', () => {
    clearAccountSessionCookies();

    expect(mocks.delete).toHaveBeenCalledWith(SESSION_COOKIE);
    expect(mocks.delete).toHaveBeenCalledWith(REFRESH_COOKIE);
    expect(mocks.delete).not.toHaveBeenCalledWith(SUPPORT_GUEST_COOKIE);
  });
});
