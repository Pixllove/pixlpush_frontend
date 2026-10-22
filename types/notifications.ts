export type NotificationScope = 'account' | 'project' | 'system';
export type NotificationCategory =
  | 'account'
  | 'security'
  | 'project'
  | 'onboarding'
  | 'team'
  | 'billing'
  | 'messaging'
  | 'integration'
  | 'announcement';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export interface NotificationProject {
  id: string;
  name: string;
  slug: string;
}

export interface AccountNotification {
  id: string;
  scope: NotificationScope;
  category: NotificationCategory;
  type: string;
  priority: NotificationPriority;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  projectId: string | null;
  expiresAt: string | null;
  createdAt: string;
  project: NotificationProject | null;
}

export interface NotificationRecipient {
  id: string;
  readAt: string | null;
  dismissedAt: string | null;
  createdAt: string;
  notification: AccountNotification;
}

export interface NotificationPage {
  items: NotificationRecipient[];
  nextCursor: string | null;
}

export interface NotificationListQuery {
  scope?: NotificationScope;
  category?: NotificationCategory;
  type?: string;
  projectId?: string;
  unread?: boolean;
  search?: string;
  cursor?: string | null;
  limit?: number;
}

export interface NotificationCountQuery {
  scope?: NotificationScope;
  category?: NotificationCategory;
  projectId?: string;
}

export interface NotificationPreference {
  id?: string;
  accountId?: string;
  category: NotificationCategory;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}
