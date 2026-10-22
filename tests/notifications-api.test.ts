import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { notificationApi } from '@/lib/notifications/api';

const notification = {
  id: 'notification-1',
  scope: 'project' as const,
  category: 'project' as const,
  type: 'project_created',
  priority: 'normal' as const,
  title: 'Project created',
  body: 'Your project is ready.',
  payload: { href: '/dashboard/settings' },
  projectId: 'project-1',
  expiresAt: null,
  createdAt: '2026-10-22T08:00:00.000Z',
  project: { id: 'project-1', name: 'Acme', slug: 'acme' },
};

describe('frontend notification API client', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('unwraps the backend data envelope and preserves notification fields', async () => {
    const body = { data: { items: [{ id: 'recipient-1', readAt: null, dismissedAt: null, createdAt: notification.createdAt, notification }], nextCursor: null } };
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => body });

    const result = await notificationApi.list({ projectId: 'project/1', unread: true, search: 'billing update', limit: 8 });

    expect(result).toEqual(body.data);
    expect(result.items[0].notification.project?.name).toBe('Acme');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/notifications?projectId=project%2F1&unread=true&search=billing+update&limit=8',
      expect.objectContaining({ method: 'GET', credentials: 'same-origin' }),
    );
  });

  it('reads unread counts and sends the expected mark-all request', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: { count: 3 } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: { updated: 3 } }) });

    await expect(notificationApi.unreadCount({ projectId: 'project-1' })).resolves.toEqual({ count: 3 });
    await expect(notificationApi.markAllRead({ projectId: 'project-1' })).resolves.toEqual({ updated: 3 });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/notifications/read-all',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ projectId: 'project-1' }) }),
    );
  });
});
