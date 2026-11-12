'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { emailApi, firebaseApi, integrationsApi, onboardingApi, projectKeys, sdkKeyApi } from '@/lib/projects/api';
import type { IntegrationCredentials, IntegrationProvider, IntegrationSettings, ProjectPlatform } from '@/types/project';
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.integrations(projectId ?? '') }),
  });
}

/** One integration's status and actions; the same for HubSpot, Salesforce, Pipedrive and any later one. */
export function useIntegration(projectId: string | undefined, provider: IntegrationProvider) {
  return {
    query: useQuery<IntegrationSettings, ApiError>({
      queryKey: [...projectKeys.integrations(projectId ?? ''), provider],
      queryFn: () => integrationsApi.get(projectId as string, provider),
      enabled: Boolean(projectId),
      refetchInterval: 60_000,
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
