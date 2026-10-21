'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowForwardRounded, CheckCircleRounded, OpenInNewRounded, ReplayRounded } from '@mui/icons-material';
import { Button, Chip, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { initialOnboardingState, onboardingCompletedCount, onboardingPercentage, type OnboardingState } from '@/lib/onboarding';
import { firebaseApi, onboardingApi } from '@/lib/projects/api';
import { useActiveProject } from '@/hooks/projects/use-active-project';

const items = [
  ['Project basics', 'Choose a clear name for this product workspace.', 'Project name'],
  ['Your product', 'Add a website or app-store link for setup context.', 'Product link'],
  ['Channels', 'Select push, email, or in-app messaging for your team.', 'Channel preferences'],
  ['Domain connection', 'Prepare a sending domain and review the DNS steps.', 'Email deliverability'],
  ['Firebase / FCM', 'Connect Firebase credentials for push delivery.', 'Push delivery'],
  ['SDK integration', 'Install the SDK and send your first product signal.', 'Product events'],
];

export default function OnboardingGuide() {
  const [state, setState] = useState<OnboardingState>(initialOnboardingState);
  const { active } = useActiveProject();
  const projectId = active?.id;
  const progress = useQuery({
    queryKey: ['projects', projectId, 'onboarding'],
    queryFn: () => onboardingApi.get(projectId!),
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });
  const firebase = useQuery({
    queryKey: ['projects', projectId, 'firebase'],
    queryFn: () => firebaseApi.get(projectId!),
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });
  useEffect(() => {
    if (!projectId) {
      setState(initialOnboardingState);
      return;
    }
    setState(progress.data
      ? { ...initialOnboardingState, ...progress.data, projectName: progress.data.projectName || active?.name || '' }
      : { ...initialOnboardingState, projectName: active?.name || '' });
  }, [active?.name, projectId, progress.data]);
  const hasProject = Boolean(projectId);
  // Project creation itself completes the first step. This also repairs old
  // progress rows that were created before the backend enforced that rule.
  const displayState = hasProject
    ? { ...state, completed: Array.from(new Set([1, ...state.completed])) }
    : state;
  const activeSteps = items.map((step, index) => ({ step, number: index + 1 }));
  const firebaseConnected = firebase.data?.status === 'connected';
  const complete = hasProject ? onboardingCompletedCount(displayState, firebaseConnected) : 0;
  const percentage = hasProject ? onboardingPercentage(displayState, firebaseConnected) : 0;

  return <div className="dashboard-onboarding">
    <Paper className="guide-welcome" elevation={0}>
      <div><Typography className="guide-eyebrow">YOUR SETUP, AT A GLANCE</Typography><Typography variant="h4" fontWeight={750}>Onboarding Guide</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Pick up where you left off. Your progress is saved to this project.</Typography></div>
      <Button href="/onboarding" variant="contained" endIcon={<ArrowForwardRounded />}>{displayState.completed.length ? 'Continue with Max' : 'Start with Max'}</Button>
      <div className="guide-project-label"><span>PROJECT</span><strong>{displayState.projectName || 'Not named yet'}</strong>{displayState.skipped && <Chip size="small" label="Paused" />}</div>
    </Paper>
    <Paper className="guide-progress-card" elevation={0}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1} alignItems={{ sm: 'center' }}>
      <div><Typography variant="h6" fontWeight={700}>Setup progress</Typography><Typography color="text.secondary" variant="body2">{complete} of 6 steps complete</Typography></div>
        <strong className="guide-percent">{percentage}%</strong>
      </Stack>
      <LinearProgress variant="determinate" value={percentage} className="onboarding-progress" />
      <div className="guide-timeline">{activeSteps.map(({ step: [title, detail, tag], number }) => {
        const done = number === 5 ? firebaseConnected : displayState.completed.includes(number);
        return <article className={`guide-step${done ? ' completed' : ''}`} key={title}>
          <div className="guide-step-icon">{done ? <CheckCircleRounded/> : <span>{number}</span>}</div>
          <div className="guide-step-copy"><div><Typography fontWeight={700}>{title}</Typography><Chip size="small" label={tag}/></div><Typography color="text.secondary" variant="body2">{detail}</Typography>{number === 1 && displayState.projectName && <small>Current value: {displayState.projectName}</small>}{number === 2 && <small>{[displayState.websiteUrl, displayState.androidAppUrl, displayState.iosAppUrl].filter(Boolean).join(' · ') || 'No links added yet'}</small>}{number === 4 && displayState.domain && <small>Domain: {displayState.domain}</small>}</div>
          <div className="guide-step-status">{number === 5 && firebaseConnected ? <Chip size="small" color="success" label="Connected"/> : done ? <Chip size="small" color="success" label="Complete"/> : <Chip size="small" variant="outlined" label="To do"/>}</div>
        </article>;
      })}</div>
      <div className="guide-note"><ReplayRounded fontSize="small"/><span>Domain and SDK steps are guidance. Firebase credentials are validated securely when you connect them from the onboarding flow.</span><Button size="small" href="/dashboard/integrations/react-native/quickstart" endIcon={<OpenInNewRounded/>}>SDK guide</Button></div>
    </Paper>
  </div>;
}
