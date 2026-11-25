'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isPermanentAuthError } from '@/lib/auth/client';
import { notificationApi } from '@/lib/notifications/api';
import type {
  NotificationCategory,
  NotificationCountQuery,
  NotificationListQuery,
  NotificationPage,
  NotificationPreference,
} from '@/types/notifications';
import type { ApiError } from '@/types/auth';
import { listenLive, type RealtimeAccess } from '@/lib/realtime';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (query: NotificationListQuery) => [...notificationKeys.all, 'list', query] as const,
  unreadCount: (query: NotificationCountQuery = {}) => [...notificationKeys.all, 'unread-count', query] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
};

const retry = (count: number, error: ApiError) => !isPermanentAuthError(error) && count < 2;

// Whether the realtime channel is up. While it is, pushes keep the counts fresh and
// polling is off; while it is down, queries fall back to a 60s poll.
let live = false;
const liveListeners = new Set<() => void>();
function setLive(next: boolean) {
  if (live === next) return;
  live = next;
  liveListeners.forEach((listener) => listener());
}
function useRealtimeLive() {
  return useSyncExternalStore(
    (listener) => { liveListeners.add(listener); return () => liveListeners.delete(listener); },
    () => live,
    () => false,
  );
}
const FALLBACK_POLL_MS = 60_000;

export function useInfiniteNotifications(query: NotificationListQuery, enabled = true) {
  const isLive = useRealtimeLive();
  return useInfiniteQuery<NotificationPage, ApiError>({
    queryKey: notificationKeys.list(query),
    queryFn: ({ pageParam }) => notificationApi.list({ ...query, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
    retry,
    staleTime: 20_000,
    refetchInterval: enabled && !isLive ? FALLBACK_POLL_MS : false,
  });
}

/**
 * One small SSE connection per mounted dashboard. Events only invalidate the
 * active queries; notification rows remain paginated and are fetched from the
 * API, so a large inbox never becomes a browser-held realtime payload.
 */
export function useNotificationRealtime(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('EventSource' in window)) return undefined;

    let disposed = false;
    let source: EventSource | undefined;
    let reconnectTimer: number | undefined;
    let attempt = 0;

    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all, refetchType: 'active' });
    };

    // SSE fallback for servers without Supabase Realtime (local development).
    const connect = () => {
      if (disposed) return;
      source = new EventSource('/api/notifications/stream');
      source.addEventListener('notification.created', refresh);
      source.addEventListener('notification.updated', refresh);
      source.onopen = () => {
        attempt = 0;
        setLive(true);
      };
      source.onerror = () => {
        setLive(false);
        source?.close();
        if (disposed || reconnectTimer) return;
        const delay = Math.min(1_000 * 2 ** attempt, 30_000);
        attempt += 1;
        reconnectTimer = window.setTimeout(() => {
          reconnectTimer = undefined;
          connect();
        }, delay);
      };
    };

    // Production: this account's private Supabase Realtime channel. Queries
    // poll every 60s only while neither channel is up.
    const stopLive = listenLive({
      access: async () => {
        const response = await fetch('/api/notifications/realtime', { credentials: 'same-origin', cache: 'no-store' });
        if (!response.ok) throw new Error(`realtime ${response.status}`);
        return ((await response.json()) as { data: RealtimeAccess }).data;
      },
      events: ['notification.created', 'notification.updated'],
      onEvent: refresh,
      onState: (up) => {
        // Catch up on anything missed while the channel was down.
        if (up && !live) refresh();
        setLive(up);
      },
      sse: () => {
        connect();
        return () => {
          disposed = true;
          if (reconnectTimer) window.clearTimeout(reconnectTimer);
          source?.close();
        };
      },
    });
    return () => {
      disposed = true;
      stopLive();
      setLive(false);
    };
  }, [enabled, queryClient]);
}

export function useNotificationUnreadCount(query: NotificationCountQuery = {}) {
  const isLive = useRealtimeLive();
  return useQuery<{ count: number }, ApiError>({
    queryKey: notificationKeys.unreadCount(query),
    queryFn: () => notificationApi.unreadCount(query),
    retry,
    staleTime: 15_000,
    refetchInterval: isLive ? false : FALLBACK_POLL_MS,
  });
}

export function useNotificationPreferences(enabled = true) {
  return useQuery<NotificationPreference[], ApiError>({
    queryKey: notificationKeys.preferences(),
    queryFn: notificationApi.preferences,
    enabled,
    retry,
    staleTime: 60_000,
  });
}

function invalidateNotifications(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation<{ read: boolean }, ApiError, string>({
    mutationFn: notificationApi.markRead,
    onSuccess: () => invalidateNotifications(queryClient),
  });
}

export function useDismissNotification() {
  const queryClient = useQueryClient();
  return useMutation<{ dismissed: boolean }, ApiError, string>({
    mutationFn: notificationApi.dismiss,
    onSuccess: () => invalidateNotifications(queryClient),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation<
    { updated: number },
    ApiError,
    { projectId?: string; category?: NotificationCategory } | undefined
  >({
    mutationFn: (input) => notificationApi.markAllRead(input),
    onSuccess: () => invalidateNotifications(queryClient),
  });
}

export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient();
  return useMutation<
    NotificationPreference,
    ApiError,
    { category: NotificationCategory; inAppEnabled?: boolean; emailEnabled?: boolean }
  >({
    mutationFn: notificationApi.updatePreference,
    onSuccess: () => invalidateNotifications(queryClient),
  });
}
