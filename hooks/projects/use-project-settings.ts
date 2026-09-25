'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { emailApi, firebaseApi, projectKeys, sdkKeyApi } from '@/lib/projects/api';
import { isPermanentAuthError } from '@/lib/auth/client';
import type { ApiError } from '@/types/auth';

type Area = 'firebase' | 'sdk-keys' | 'email';

/** Reads one settings area of a Project; disabled until the id is known. */
function useArea<T>(projectId: string | undefined, area: Area, fetch: (id: string) => Promise<T>) {
  return useQuery<T, ApiError>({
    queryKey: projectKeys.setting(projectId ?? '', area),
    queryFn: () => fetch(projectId as string),
    enabled: Boolean(projectId),
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
  };
}

export function useSdkKeys(projectId: string | undefined) {
  return {
    query: useArea(projectId, 'sdk-keys', sdkKeyApi.list),
    create: useAreaMutation(projectId, 'sdk-keys', sdkKeyApi.create),
    revoke: useAreaMutation(projectId, 'sdk-keys', sdkKeyApi.revoke),
  };
}

export function useEmailSettings(projectId: string | undefined) {
  return {
    query: useArea(projectId, 'email', emailApi.get),
    configure: useAreaMutation(projectId, 'email', emailApi.configure),
    verify: useAreaMutation(projectId, 'email', (id, _: void) => emailApi.verify(id)),
  };
}
