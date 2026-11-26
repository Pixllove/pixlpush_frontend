'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apnsApi, emailApi, firebaseApi, integrationsApi, onboardingApi, projectKeys, sdkKeyApi } from '@/lib/projects/api';
import type { ConnectionProvider, IntegrationCredentials, IntegrationSettings, ProjectPlatform } from '@/types/project';
import { isPermanentAuthError } from '@/lib/auth/client';
import type { ApiError } from '@/types/auth';

type Area = 'firebase' | 'sdk-keys' | 'email';

/** Reads one settings area of a Project; disabled until the id is known. */
function useArea<T>(projectId: string | undefined, area: Area, fetch: (id: string) => Promise<T>) {
  return useQuery<T, ApiError>({
    queryKey: projectKeys.setting(projectId ?? '', area),
    queryFn: () => fetch(projectId as string),
    enabled: Boolean(projectId),
    refetchInterval: false,
    retry: (count, error) => !isPermanentAuthError(error) && count < 2,
  });
}

/** A write that refreshes its area afterwards, so the panel shows server truth. */
function useAreaMutation<TIn, TOut>(projectId: string | undefined, area: Area, run: (id: string, input: TIn) => Promise<TOut>) {
  const queryClient = useQueryClient();
  return useMutation<TOut, ApiError, TIn>({
    mutationFn: (input) => run(projectId as string, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.setting(projectId ?? '', area) }),
  });
}

export function useFirebaseSettings(projectId: string | undefined) {
  return {
    query: useArea(projectId, 'firebase', firebaseApi.get),
    upload: useAreaMutation(projectId, 'firebase', firebaseApi.upload),
    verify: useAreaMutation(projectId, 'firebase', (id, _: void) => firebaseApi.verify(id)),
    disconnect: useAreaMutation(projectId, 'firebase', (id, _: void) => firebaseApi.disconnect(id)),
    /** Website / mobile choice; stored on the Project through the onboarding API. */
    platforms: useAreaMutation(projectId, 'firebase', (id, platforms: ProjectPlatform[]) => onboardingApi.update(id, { platforms })),
  };
}

/**
 * Direct APNs (iOS without Firebase). Its status comes back inside the Firebase
 * settings (one request for the whole Push setup card), so writes refresh that area.
 */
export function useApnsSettings(projectId: string | undefined) {
  return {
    upload: useAreaMutation(projectId, 'firebase', apnsApi.upload),
    verify: useAreaMutation(projectId, 'firebase', (id, _: void) => apnsApi.verify(id)),
    disconnect: useAreaMutation(projectId, 'firebase', (id, _: void) => apnsApi.disconnect(id)),
  };
}

/** Every integration of the Project with its status (one request; the hub page and status chips). */
export function useIntegrations(projectId: string | undefined) {
  return useQuery<IntegrationSettings[], ApiError>({
    queryKey: projectKeys.integrations(projectId ?? ''),
    queryFn: () => integrationsApi.list(projectId as string),
    enabled: Boolean(projectId),
    // Sync status changes in the background worker.
    refetchInterval: 60_000,
    retry: (count, error) => !isPermanentAuthError(error) && count < 2,
  });
}

/** A write to one integration; refreshes it and the hub's list. */
function useIntegrationMutation<TIn>(projectId: string | undefined, run: (id: string, input: TIn) => Promise<IntegrationSettings>) {
  const queryClient = useQueryClient();
  return useMutation<IntegrationSettings, ApiError, TIn>({
    mutationFn: (input) => run(projectId as string, input),
    // The response is the fresh status: store it instead of re-fetching, and refresh only the hub's list.
    onSuccess: (settings) => {
      queryClient.setQueryData([...projectKeys.integrations(projectId ?? ''), settings.provider], settings);
      void queryClient.invalidateQueries({ queryKey: projectKeys.integrations(projectId ?? ''), exact: true });
    },
  });
}

/**
 * Next status refresh, driven by what the server says is happening:
 * a batch running → every 5s; otherwise wake just after the scheduled next sync
 * (clamped to 15s–5min); failures back off exponentially. Hidden tabs never poll
 * (React Query's default) and refetch on focus instead.
 */
export function integrationPollMs(data: IntegrationSettings | undefined, failures = 0): number | false {
  if (failures > 0) return Math.min(5_000 * 2 ** failures, 300_000);
  if (!data?.connected || !data.syncEnabled) return false;
  // Running, or queued by "Sync now" and waiting for the worker to pick it up.
  if (data.fetching || (data.syncing && !data.importing)) return 5_000;
  if (!data.nextSyncAt) return 60_000;
  const untilDue = new Date(data.nextSyncAt).getTime() - Date.now();
  // Due or overdue: the worker is about to sync or is syncing, so check often until it reports back.
  if (untilDue <= 0) return untilDue > -120_000 ? 3_000 : 15_000;
  return Math.min(untilDue + 1_000, 300_000);
}

/** One integration's status and actions; the same for HubSpot, Salesforce, Pipedrive and any later one. */
export function useIntegration(projectId: string | undefined, provider: ConnectionProvider) {
  return {
    query: useQuery<IntegrationSettings, ApiError>({
      queryKey: [...projectKeys.integrations(projectId ?? ''), provider],
      queryFn: () => integrationsApi.get(projectId as string, provider),
      enabled: Boolean(projectId),
      refetchInterval: (query) => integrationPollMs(query.state.data, query.state.fetchFailureCount),
      retry: (count, error) => !isPermanentAuthError(error) && count < 2,
    }),
    connect: useIntegrationMutation(projectId, (id, input: IntegrationCredentials) => integrationsApi.connect(id, provider, input)),
    setSyncEnabled: useIntegrationMutation(projectId, (id, on: boolean) => integrationsApi.setSyncEnabled(id, provider, on)),
    syncNow: useIntegrationMutation(projectId, (id, _: void) => integrationsApi.syncNow(id, provider)),
    disconnect: useIntegrationMutation(projectId, (id, _: void) => integrationsApi.disconnect(id, provider)),
    oauthCallback: useIntegrationMutation(projectId, (id, input: { code: string; state?: string }) => integrationsApi.oauthCallback(id, provider, input)),
  };
}

export function useSdkKeys(projectId: string | undefined) {
  return {
    query: useArea(projectId, 'sdk-keys', sdkKeyApi.list),
    create: useAreaMutation(projectId, 'sdk-keys', sdkKeyApi.create),
    revoke: useAreaMutation(projectId, 'sdk-keys', sdkKeyApi.revoke),
    remove: useAreaMutation(projectId, 'sdk-keys', sdkKeyApi.remove),
  };
}

export function useEmailSettings(projectId: string | undefined) {
  return {
    query: useArea(projectId, 'email', emailApi.get),
    sendTest: useAreaMutation(projectId, 'email', emailApi.sendTest),
  };
}
