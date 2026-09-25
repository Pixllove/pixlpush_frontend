'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectApi, projectKeys } from '@/lib/projects/api';
import { isPermanentAuthError } from '@/lib/auth/client';
import type { ApiError } from '@/types/auth';
import type { Project, ProjectDetail, UpdateProjectInput } from '@/types/project';

/** Projects the signed-in Account belongs to. Drives the selector. */
export function useProjects() {
  return useQuery<Project[], ApiError>({
    queryKey: projectKeys.list(),
    queryFn: projectApi.list,
    // A 401/403 will not start succeeding on retry.
    retry: (count, error) => !isPermanentAuthError(error) && count < 2,
  });
}

/**
 * One Project's context. Disabled until an id is known, so switching projects
 * does not fire a request for `undefined`.
 */
export function useProject(projectId: string | undefined) {
  return useQuery<ProjectDetail, ApiError>({
    queryKey: projectKeys.detail(projectId ?? ''),
    queryFn: () => projectApi.get(projectId as string),
    enabled: Boolean(projectId),
    retry: (count, error) => !isPermanentAuthError(error) && count < 2,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation<Project, ApiError, { name: string; slug?: string }>({
    mutationFn: projectApi.create,
    onSuccess: async () => {
      // The new Project must appear in the selector straight away.
      await queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useUpdateProject(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<ProjectDetail, ApiError, UpdateProjectInput>({
    mutationFn: (input) => projectApi.update(projectId as string, input),
    onSuccess: async () => {
      // A renamed Project must change in the selector and sidebar too.
      await queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

/** Deactivate or restore; both change status everywhere the Project is shown. */
export function useProjectStatus(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: projectKeys.all });

  return {
    deactivate: useMutation<Project, ApiError>({ mutationFn: () => projectApi.deactivate(projectId as string), onSuccess }),
    restore: useMutation<Project, ApiError>({ mutationFn: () => projectApi.restore(projectId as string), onSuccess }),
  };
}
