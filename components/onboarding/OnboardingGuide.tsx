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
  ['Firebase / FCM', 'Connect Firebase credentials if you plan to send push.', 'Push delivery'],
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
  const usePush = hasProject && state.channels.includes('push');
  const activeSteps = items.map((step, index) => ({ step, number: index + 1 }));
  const firebaseConnected = firebase.data?.status === 'connected';
  const complete = hasProject ? onboardingCompletedCount(state, firebaseConnected) : 0;
  const percentage = hasProject ? onboardingPercentage(state, firebaseConnected) : 0;

  return <div className="dashboard-onboarding">
    <Paper className="guide-welcome" elevation={0}>
      <div><Typography className="guide-eyebrow">YOUR SETUP, AT A GLANCE</Typography><Typography variant="h4" fontWeight={750}>Onboarding Guide</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Pick up where you left off. Your progress is saved to this project.</Typography></div>
      <Button href="/onboarding" variant="contained" endIcon={<ArrowForwardRounded />}>{state.completed.length ? 'Continue with Max' : 'Start with Max'}</Button>
      <div className="guide-project-label"><span>PROJECT</span><strong>{state.projectName || 'Not named yet'}</strong>{state.skipped && <Chip size="small" label="Paused" />}</div>
    </Paper>
    <Paper className="guide-progress-card" elevation={0}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1} alignItems={{ sm: 'center' }}>
      <div><Typography variant="h6" fontWeight={700}>Setup progress</Typography><Typography color="text.secondary" variant="body2">{complete} of 6 steps complete{hasProject && !usePush && ' · Firebase is marked not needed because push isn’t selected'}</Typography></div>
        <strong className="guide-percent">{percentage}%</strong>
      </Stack>
      <LinearProgress variant="determinate" value={percentage} className="onboarding-progress" />
      <div className="guide-timeline">{activeSteps.map(({ step: [title, detail, tag], number }) => {
        const notNeeded = hasProject && number === 5 && !usePush;
        const done = state.completed.includes(number) || (number === 5 && firebaseConnected);
        return <article className={`guide-step${done ? ' completed' : ''}${notNeeded ? ' not-needed' : ''}`} key={title}>
          <div className="guide-step-icon">{done ? <CheckCircleRounded/> : notNeeded ? <span aria-label="Not needed">–</span> : <span>{number}</span>}</div>
          <div className="guide-step-copy"><div><Typography fontWeight={700}>{title}</Typography><Chip size="small" label={tag}/></div><Typography color="text.secondary" variant="body2">{detail}</Typography>{number === 1 && state.projectName && <small>Current value: {state.projectName}</small>}{number === 2 && <small>{[state.websiteUrl, state.androidAppUrl, state.iosAppUrl].filter(Boolean).join(' · ') || 'No links added yet'}</small>}{number === 4 && state.domain && <small>Domain: {state.domain}</small>}</div>
          <div className="guide-step-status">{notNeeded ? <Chip size="small" variant="outlined" label="Not needed"/> : number === 5 && firebaseConnected ? <Chip size="small" color="success" label="Connected"/> : number === 5 && done ? <Chip size="small" color="success" label="Guide reviewed"/> : done ? <Chip size="small" color="success" label="Complete"/> : <Chip size="small" variant="outlined" label="To do"/>}</div>
        </article>;
      })}</div>
      <div className="guide-note"><ReplayRounded fontSize="small"/><span>Domain and SDK steps are guidance. Firebase credentials are validated securely when you connect them from the onboarding flow.</span><Button size="small" href="/dashboard/integrations/react-native/quickstart" endIcon={<OpenInNewRounded/>}>SDK guide</Button></div>
    </Paper>
  </div>;
}
