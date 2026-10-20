'use client';

import { useEffect, useState } from 'react';
import { ArrowForwardRounded, CheckCircleRounded, OpenInNewRounded, ReplayRounded } from '@mui/icons-material';
import { Button, Chip, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { initialOnboardingState, readOnboardingState, type OnboardingState } from '@/lib/onboarding';

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
  useEffect(() => {
    setState(readOnboardingState());
    const sync = () => setState(readOnboardingState());
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('focus', sync); };
  }, []);
  const usePush = state.channels.includes('push');
  const activeSteps = items.map((step, index) => ({ step, number: index + 1 }));
  const complete = activeSteps.filter(({ number }) => state.completed.includes(number) || (number === 5 && !usePush)).length;

  return <div className="dashboard-onboarding">
    <Paper className="guide-welcome" elevation={0}>
      <div><Typography className="guide-eyebrow">YOUR SETUP, AT A GLANCE</Typography><Typography variant="h4" fontWeight={750}>Onboarding Guide</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Pick up where you left off. Your progress is saved in this browser.</Typography></div>
      <Button href="/onboarding" variant="contained" endIcon={<ArrowForwardRounded />}>{state.completed.length ? 'Continue with Max' : 'Start with Max'}</Button>
      <div className="guide-project-label"><span>PROJECT</span><strong>{state.projectName || 'Not named yet'}</strong>{state.skipped && <Chip size="small" label="Paused" />}</div>
    </Paper>
    <Paper className="guide-progress-card" elevation={0}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1} alignItems={{ sm: 'center' }}>
      <div><Typography variant="h6" fontWeight={700}>Setup progress</Typography><Typography color="text.secondary" variant="body2">{complete} of 6 steps complete{!usePush && ' · Firebase is marked not needed because push isn’t selected'}</Typography></div>
        <strong className="guide-percent">{activeSteps.length ? Math.round((complete / activeSteps.length) * 100) : 0}%</strong>
      </Stack>
      <LinearProgress variant="determinate" value={activeSteps.length ? (complete / activeSteps.length) * 100 : 0} className="onboarding-progress" />
      <div className="guide-timeline">{activeSteps.map(({ step: [title, detail, tag], number }) => {
        // A step explicitly marked not-needed is resolved, so it should receive
        // the same green completion treatment as a completed step.
        const notNeeded = number === 5 && !usePush;
        const done = state.completed.includes(number) || notNeeded;
        return <article className={`guide-step${done ? ' completed' : ''}`} key={title}>
          <div className="guide-step-icon">{done ? <CheckCircleRounded/> : <span>{number}</span>}</div>
          <div className="guide-step-copy"><div><Typography fontWeight={700}>{title}</Typography><Chip size="small" label={tag}/></div><Typography color="text.secondary" variant="body2">{detail}</Typography>{number === 1 && state.projectName && <small>Current value: {state.projectName}</small>}{number === 2 && <small>{[state.websiteUrl, state.androidAppUrl, state.iosAppUrl].filter(Boolean).join(' · ') || 'No links added yet'}</small>}{number === 4 && state.domain && <small>Domain: {state.domain}</small>}</div>
          <div className="guide-step-status">{number === 5 && !usePush ? <Chip size="small" variant="outlined" label="Not needed"/> : number === 5 && done ? <Chip size="small" color="success" label="Guide reviewed"/> : done ? <Chip size="small" color="success" label="Complete"/> : <Chip size="small" variant="outlined" label="To do"/>}</div>
        </article>;
      })}</div>
      <div className="guide-note"><ReplayRounded fontSize="small"/><span>Domain, Firebase and SDK steps are guidance previews. No integrations or credentials are submitted from this flow.</span><Button size="small" href="/dashboard/integrations/react-native/quickstart" endIcon={<OpenInNewRounded/>}>SDK guide</Button></div>
    </Paper>
  </div>;
}
