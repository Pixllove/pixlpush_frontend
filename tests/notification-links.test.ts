import { describe, expect, it } from 'vitest';
import { notificationHref, notificationProjectId } from '@/components/dashboard/NotificationInbox';
import type { AccountNotification } from '@/types/notifications';

const n = (type: string, payload: Record<string, unknown> = {}, projectId: string | null = null) =>
  ({ type, payload, projectId }) as AccountNotification;

describe('notification links', () => {
  it('opens the page the notification is about, never the inbox', () => {
    expect(notificationHref(n('project_created', { isFirstProject: true }))).toBe('/dashboard/settings/sdk-keys');
    expect(notificationHref(n('billing_access_locked'))).toBe('/dashboard/billing?tab=methods');
    expect(notificationHref(n('admin_journey_paused', { entityId: 'j1' }))).toBe('/dashboard/journeys/builder?id=j1');
    expect(notificationHref(n('admin_campaign_stopped', { entityType: 'email_campaign', entityId: 'c1' }))).toBe('/dashboard/email?highlight=c1');
    expect(notificationHref(n('platform_announcement', { href: '/dashboard/journeys' }))).toBe('/dashboard/journeys');
    expect(notificationHref(n('platform_announcement', { href: 'https://evil.example' }))).toBeNull();
    expect(notificationHref(n('platform_announcement', { href: '//evil.example' }))).toBeNull();
    expect(notificationHref(n('project_access_removed'))).toBeNull();
  });

  it('finds the project to switch to', () => {
    expect(notificationProjectId(n('x', { projectId: 'p2' }))).toBe('p2');
    expect(notificationProjectId(n('x', { projectId: 'p2' }, 'p1'))).toBe('p1');
  });
});
