import { authRequest } from '@/lib/auth/client';
import type {
  NotificationCategory,
  NotificationCountQuery,
  NotificationListQuery,
  NotificationPage,
  NotificationPreference,
} from '@/types/notifications';

const BASE = '/api/notifications';

function queryString(input: Record<string, string | number | boolean | null | undefined>): string {
  const query = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const encoded = query.toString();
  return encoded ? `?${encoded}` : '';
}

export const notificationApi = {
  list: (input: NotificationListQuery = {}) =>
    authRequest<NotificationPage>(
      queryString({
        scope: input.scope,
        category: input.category,
        type: input.type,
        projectId: input.projectId,
        unread: input.unread ? true : undefined,
        search: input.search,
        cursor: input.cursor,
        limit: input.limit ?? 25,
      }),
      undefined,
      BASE,
    ),

  unreadCount: (input: NotificationCountQuery = {}) =>
    authRequest<{ count: number }>(`/unread-count${queryString({ ...input })}`, undefined, BASE),

  markAllRead: (input: { projectId?: string; category?: NotificationCategory } = {}) =>
    authRequest<{ updated: number }>('/read-all', input, BASE),

  markRead: (notificationId: string) =>
    authRequest<{ read: boolean }>(`/${encodeURIComponent(notificationId)}/read`, {}, BASE),

  dismiss: (notificationId: string) =>
    authRequest<{ dismissed: boolean }>(`/${encodeURIComponent(notificationId)}/dismiss`, {}, BASE),

  preferences: () => authRequest<NotificationPreference[]>('/preferences', undefined, BASE),

  updatePreference: (input: { category: NotificationCategory; inAppEnabled?: boolean; emailEnabled?: boolean }) =>
    authRequest<NotificationPreference>('/preferences', input, BASE, 'PATCH'),
};
