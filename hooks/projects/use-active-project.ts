'use client';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { setSelectedProject } from '@/lib/uiSlice';
import { useProjects } from './use-projects';
import type { Project } from '@/types/project';

/** The secondary label beside a Project name, e.g. "Pro project". */
export function planLabel(project: Pick<Project, 'subscription'>): string {
  const plan = project.subscription?.plan;
  return plan ? `${plan.charAt(0).toUpperCase()}${plan.slice(1)} project` : 'Project';
}

/**
 * The Account's Projects and which one is active.
 *
 * Every consumer reads the selection from here, so the selector, the sidebar
 * card and the page headings can never disagree. Nothing is invented: with no
 * Projects there is no active one, and callers render their empty state.
 */
export function useActiveProject() {
  const dispatch = useDispatch();
  const selectedId = useSelector((state: RootState) => state.ui.selectedProject);
  const { data: projects, isPending, isError } = useProjects();

  // Restore the last selection before the list arrives, so switching pages
  // does not momentarily fall back to a different Project. A ?project= link
  // (e.g. from an access email) wins; an id without access falls back below.
  useEffect(() => {
    const linked = new URLSearchParams(window.location.search).get('project');
    const saved = linked ?? window.localStorage.getItem('pixlpush:selectedProject');
    if (saved) dispatch(setSelectedProject(saved));
  }, [dispatch]);

  useEffect(() => {
    if (selectedId) window.localStorage.setItem('pixlpush:selectedProject', selectedId);
  }, [selectedId]);

  /**
   * Selecting the first Project when the remembered one is gone covers both a
   * first sign-in and a Project the Account has lost access to.
   */
  useEffect(() => {
    if (!projects?.length) return;
    if (!projects.some((p) => p.id === selectedId)) dispatch(setSelectedProject(projects[0].id));
  }, [projects, selectedId, dispatch]);

  const active = projects?.find((p) => p.id === selectedId);

  return {
    projects: projects ?? [],
    active,
    /** True once loading is done and the Account genuinely has no Projects. */
    isEmpty: !isPending && !isError && projects?.length === 0,
    isPending,
    isError,
  };
}
