import { beforeEach, describe, expect, it, vi } from 'vitest';

const authRequest = vi.fn((..._args: unknown[]) => Promise.resolve({}));
vi.mock('@/lib/auth/client', () => ({ authRequest: (...args: unknown[]) => authRequest(...args) }));

import { usersApi } from '@/lib/projects/api';

const query = () => new URLSearchParams(String(authRequest.mock.calls.at(-1)?.[0]).split('?')[1]);

describe('Users page filter', () => {
  beforeEach(() => authRequest.mockClear());

  it('"All users" sends no filter, so every user in the project is listed', async () => {
    await usersApi.list('p1', { filter: 'all' });
    expect(query().has('filter')).toBe(false);
    expect(query().has('status')).toBe(false);
  });

  it('each option reaches the API unchanged', async () => {
    for (const filter of ['email-subscribed', 'email-unsubscribed', 'push-enabled', 'unreachable'] as const) {
      await usersApi.list('p1', { filter });
      expect(query().get('filter')).toBe(filter);
    }
  });
});
