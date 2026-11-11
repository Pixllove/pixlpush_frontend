'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowForwardRounded, CheckCircleRounded, OpenInNewRounded, ReplayRounded } from '@mui/icons-material';
import { Button, Chip, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { initialOnboardingState, onboardingCompletedCount, onboardingPercentage, onboardingStepsOf, pushReadyOf, type OnboardingState, type OnboardingStepKind } from '@/lib/onboarding';
import { firebaseApi, onboardingApi } from '@/lib/projects/api';
import { useActiveProject } from '@/hooks/projects/use-active-project';

const stepCopy: Record<OnboardingStepKind, [string, string]> = {
  basics: ['Choose a clear name for this product workspace.', 'Project name'],
  products: ['Add a website or app-store link for setup context.', 'Product link'],
  channels: ['Select push, email, or in-app messaging for your team.', 'Channel preferences'],
  domain: ['Prepare a sending domain and review the DNS steps.', 'Email deliverability'],
  'mobile-push': ['Connect Firebase credentials so your app can deliver push notifications.', 'Push delivery'],
  'app-sdk': ['Install the SDK in your app and send your first product signal.', 'Product events'],
  'web-sdk': ['Add PixlPush to your website for events and Web Push.', 'Product events'],
};

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
  const displayState = state;
  const activeSteps = onboardingStepsOf(displayState.platforms, displayState.channels).map(({ kind, title }, index) => ({
    step: [title, ...stepCopy[kind]],
    kind,
    number: index + 1,
  }));
  const firebaseConnected = pushReadyOf(firebase.data);
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
      <div><Typography variant="h6" fontWeight={700}>Setup progress</Typography><Typography color="text.secondary" variant="body2">{complete} of {activeSteps.length} steps complete</Typography></div>
        <strong className="guide-percent">{percentage}%</strong>
      </Stack>
      <LinearProgress variant="determinate" value={percentage} className="onboarding-progress" />
      <div className="guide-timeline">{activeSteps.map(({ step: [title, detail, tag], kind, number }) => {
        const done = displayState.completed.includes(number);
        return <article className={`guide-step${done ? ' completed' : ''}`} key={title}>
          <div className="guide-step-icon">{done ? <CheckCircleRounded/> : <span>{number}</span>}</div>
          <div className="guide-step-copy"><div><Typography fontWeight={700}>{title}</Typography><Chip size="small" label={tag}/></div><Typography color="text.secondary" variant="body2">{detail}</Typography>{kind === 'basics' && displayState.projectName && <small>Current value: {displayState.projectName}</small>}{kind === 'products' && <small>{[displayState.websiteUrl, displayState.androidAppUrl, displayState.iosAppUrl].filter(Boolean).join(' · ') || 'No links added yet'}</small>}{kind === 'domain' && displayState.domain && <small>Domain: {displayState.domain}</small>}</div>
          <div className="guide-step-status">{kind === 'mobile-push' && firebaseConnected ? <Chip size="small" color="success" label="Ready"/> : done ? <Chip size="small" color="success" label="Complete"/> : <Chip size="small" variant="outlined" label="To do"/>}</div>
        </article>;
      })}</div>
      <div className="guide-note"><ReplayRounded fontSize="small"/><span>Domain and SDK steps are guidance. Firebase credentials are validated securely when you connect them from the onboarding flow.</span><Button size="small" href={displayState.platforms?.includes('web') ? '/dashboard/integrations/web/quickstart' : '/dashboard/integrations/react-native/quickstart'} endIcon={<OpenInNewRounded/>}>SDK guide</Button></div>
    </Paper>
  </div>;
}
