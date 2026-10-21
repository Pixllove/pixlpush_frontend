'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowBackRounded, ArrowForwardRounded, AutoAwesomeRounded, CheckRounded, ContentCopyRounded,
  LanguageRounded, MailOutlineRounded, NotificationsActiveRounded, PhoneIphoneRounded, RocketLaunchRounded,
} from '@mui/icons-material';
import {
  Alert, Box, Button, Checkbox, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, IconButton, LinearProgress, Paper, Stack, TextField, Typography,
} from '@mui/material';
import { initialOnboardingState, readOnboardingState, saveOnboardingState, type OnboardingState } from '@/lib/onboarding';

const steps = [
  ['Project basics', 'Give your workspace a name'],
  ['Your product', 'Add your website or app link'],
  ['Channels', 'Choose how you’ll reach customers'],
  ['Domain', 'Prepare your sending domain'],
  ['Push setup', 'Connect Firebase Cloud Messaging'],
  ['SDK install', 'Bring product signals into PixlPush'],
];
const channelOptions = [
  { id: 'push', title: 'Push notifications', detail: 'Reach opted-in users on mobile and web.', icon: NotificationsActiveRounded },
  { id: 'email', title: 'Email', detail: 'Send lifecycle and product updates.', icon: MailOutlineRounded },
  { id: 'in-app', title: 'In-app messages', detail: 'Show timely messages inside your product.', icon: PhoneIphoneRounded },
];

export default function OnboardingWizard() {
  const router = useRouter();
  const [state, setState] = useState<OnboardingState>(initialOnboardingState);
  const [copied, setCopied] = useState(false);
  const [firebaseDialogOpen, setFirebaseDialogOpen] = useState(false);
  useEffect(() => setState(readOnboardingState()), []);
  useEffect(() => saveOnboardingState(state), [state]);

  const currentStep = Math.min(6, Math.max(1, state.currentStep));
  const pushEnabled = state.channels.includes('push');
  const completedCount = state.completed.filter((step) => step !== 5 || pushEnabled).length + (pushEnabled ? 0 : 1);

  const patch = (value: Partial<OnboardingState>) => setState((previous) => ({ ...previous, ...value, skipped: false }));
  const openFirebaseWithMax = () => {
    if (!pushEnabled) patch({ channels: [...state.channels, 'push'], completed: state.completed.filter((step) => step !== 5) });
    setFirebaseDialogOpen(true);
  };
  const toggleFirebaseCheck = (step: number) => patch({ firebaseChecklist: state.firebaseChecklist.includes(step)
    ? state.firebaseChecklist.filter((item) => item !== step)
    : [...state.firebaseChecklist, step] });
  const completeFirebaseWalkthrough = () => {
    const nextState = { ...state, channels: state.channels.includes('push') ? state.channels : [...state.channels, 'push'], completed: [...new Set([...state.completed, 5])], firebaseChecklist: [1, 2, 3], skipped: false };
    saveOnboardingState(nextState);
    setState(nextState);
    setFirebaseDialogOpen(false);
  };
  const next = () => {
    const completed = new Set(state.completed);
    completed.add(currentStep);
    if (currentStep === 6) {
      const finished = { ...state, completed: [...completed], currentStep: 6, skipped: false };
      saveOnboardingState(finished);
      setState(finished);
      router.push('/dashboard');
      return;
    }
    setState({ ...state, completed: [...completed], currentStep: currentStep + 1, skipped: false });
  };
  const skip = () => {
    const paused = { ...state, skipped: true };
    saveOnboardingState(paused);
    setState(paused);
    router.push('/dashboard/onboarding');
  };
  const toggleChannel = (id: string) => {
    const adding = !state.channels.includes(id);
    patch({
      channels: adding ? [...state.channels, id] : state.channels.filter((x) => x !== id),
      ...(id === 'push' && adding ? { completed: state.completed.filter((step) => step !== 5), firebaseChecklist: [] } : {}),
    });
  };

  const canContinue = currentStep === 1 ? Boolean(state.projectName.trim()) : currentStep === 3 ? state.channels.length > 0 : currentStep === 5 && pushEnabled ? state.completed.includes(5) : true;
  const heading = currentStep === 5 && !pushEnabled ? 'No push setup needed right now.' : ['What should we call your project?', 'Where can customers find your product?', 'Which channels do you want to use?', 'Let’s get your domain ready.', 'Set up push with Firebase.', 'Add the PixlPush SDK to your app.'][currentStep - 1];
  const prompt = currentStep === 5 && !pushEnabled ? 'You haven’t selected push notifications, so we can leave Firebase for later. Let’s move on to SDK setup.' : [
    'I’m Max, your onboarding guide. Let’s start with a name for the product or workspace you’re setting up.',
    'Great start. Share a public website or app-store link so we can keep this setup focused on your product. No business analysis is needed.',
    'Choose every channel you plan to use. We’ll tailor the remaining setup to your selections.',
    'A sending domain helps your email reach the inbox and look like it came from your brand. Add the domain you plan to use; this demo won’t change DNS.',
    'Push notifications need Firebase Cloud Messaging credentials. I’ll point you to the steps; this preview does not connect Firebase.',
    'Install the SDK when you’re ready to send product events and register devices. Here’s a starter prompt you can share with your coding assistant.',
  ][currentStep - 1];

  return (
    <Box className="onboarding-shell">
      <Container maxWidth="lg" className="onboarding-container">
        <header className="onboarding-topbar">
          <a className="onboarding-brand" href="/" aria-label="PixlPush home"><span className="onboarding-mark">P</span><span>Pixl<span>Push</span></span></a>
          <Button onClick={skip} variant="outlined" className="onboarding-skip">Skip setup <ArrowForwardRounded fontSize="small" /></Button>
        </header>

        <Box className="onboarding-progress-area">
          <Stack direction="row" justifyContent="space-between" alignItems="end" mb={1.5}>
            <Box><Typography className="onboarding-eyebrow">YOUR PIXLPUSH SETUP</Typography><Typography variant="h6" fontWeight={700}>A strong foundation, one step at a time</Typography></Box>
          <Typography variant="body2" color="text.secondary">{completedCount} of 6 complete</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={(completedCount / 6) * 100} className="onboarding-progress" />
          <div className="onboarding-stepper">
            {steps.map(([title], index) => {
              const number = index + 1;
              const notNeeded = number === 5 && !pushEnabled;
              const done = state.completed.includes(number) && !notNeeded;
              const locked = number > currentStep && !state.completed.includes(number);
              return <button key={title} className={`onboarding-step${done ? ' is-done' : ''}${notNeeded ? ' is-not-needed' : ''}${currentStep === number ? ' is-current' : ''}`} onClick={() => !locked && setState({ ...state, currentStep: number })} disabled={locked}>
                <span className="onboarding-step-number">{done ? <CheckRounded fontSize="small" /> : notNeeded ? '–' : number}</span><span>{title}{notNeeded ? ' · Not needed' : ''}</span>
              </button>;
            })}
          </div>
        </Box>

        <div className="onboarding-workspace">
          <Paper elevation={0} className="onboarding-chat">
            <div className="onboarding-chat-head"><span className="max-avatar"><img src="/assets/agent-avatar-max-v4.png" alt="Max" /></span><span><strong>Max</strong><small>PIXLPUSH ONBOARDING GUIDE · PREVIEW</small></span><Chip size="small" label="Ready to help" className="max-online" /></div>
            <div className="onboarding-chat-body">
              <div className="max-message"><AutoAwesomeRounded fontSize="small" /><p>{prompt}</p></div>
              <div className="onboarding-question"><Typography className="onboarding-eyebrow">STEP {String(currentStep).padStart(2, '0')} · {steps[currentStep - 1][0].toUpperCase()}</Typography><Typography variant="h4" className="onboarding-question-title">{heading}</Typography>
                {currentStep === 1 && <TextField autoFocus fullWidth label="Project name" placeholder="e.g. Northstar Mobile" value={state.projectName} onChange={(e) => patch({ projectName: e.target.value })} helperText="You can change this any time." />}
                {currentStep === 2 && <Stack gap={1.5}><TextField fullWidth label="Website URL" placeholder="https://yourproduct.com" value={state.websiteUrl} onChange={(e) => patch({ websiteUrl: e.target.value })}/><TextField fullWidth label="Android app link" placeholder="Google Play Store URL" value={state.androidAppUrl} onChange={(e) => patch({ androidAppUrl: e.target.value })}/><TextField fullWidth label="iOS app link" placeholder="Apple App Store URL" value={state.iosAppUrl} onChange={(e) => patch({ iosAppUrl: e.target.value })}/><Alert severity="info" icon={<LanguageRounded />}>Add the links you have. We’ll use them only as setup context—no business analysis.</Alert></Stack>}
                {currentStep === 3 && <div className="onboarding-channel-grid">{channelOptions.map(({ id, title, detail, icon: Icon }) => <button key={id} className={`onboarding-channel${state.channels.includes(id) ? ' selected' : ''}`} onClick={() => toggleChannel(id)}><span className="onboarding-channel-icon"><Icon /></span><span><strong>{title}</strong><small>{detail}</small></span>{state.channels.includes(id) && <CheckRounded className="onboarding-channel-check"/>}</button>)}</div>}
                {currentStep === 4 && <Stack gap={2}><TextField fullWidth label="Sending domain" placeholder="mail.yourproduct.com" value={state.domain} onChange={(e) => patch({ domain: e.target.value })}/><Paper elevation={0} className="onboarding-guidance"><strong>What you’ll do later</strong><span>Verify ownership · Add DNS records · Confirm authentication</span><small>This is a guided preview only. No DNS records are created or verified here.</small></Paper></Stack>}
                {currentStep === 5 && (pushEnabled ? <Stack gap={2}><Paper elevation={0} className="onboarding-guidance"><strong>Firebase Cloud Messaging</strong><span>Max can guide you through choosing your Firebase project, enabling Cloud Messaging, and preparing the PixlPush configuration.</span><small>For safety, never paste service-account private keys into this preview. No credentials are collected or transmitted.</small></Paper><Button variant="contained" onClick={openFirebaseWithMax} startIcon={<AutoAwesomeRounded />}>{state.completed.includes(5) ? 'Review Firebase with Max' : 'Connect Firebase with Max'}</Button>{state.completed.includes(5) && <Alert severity="success">Firebase setup checklist reviewed. Your actual Firebase project has not been connected in this preview.</Alert>}</Stack> : <Stack gap={2}><Alert severity="info" icon={<NotificationsActiveRounded />}>Push notifications weren’t selected. You can still add push now and have Max guide you through Firebase.</Alert><Button variant="contained" onClick={openFirebaseWithMax} startIcon={<AutoAwesomeRounded />}>Enable push &amp; set up Firebase with Max</Button></Stack>)}
                {currentStep === 6 && <Stack gap={2}><Paper elevation={0} className="onboarding-code"><code>Set up the PixlPush SDK in my {state.projectName || 'app'}. Guide me through installation, initialize it safely, register push permissions if enabled, and track a first test event. Do not expose secrets.</code><IconButton aria-label="Copy setup prompt" onClick={() => { navigator.clipboard?.writeText(`Set up the PixlPush SDK in my ${state.projectName || 'app'}. Guide me through installation, initialize it safely, register push permissions if enabled, and track a first test event. Do not expose secrets.`); setCopied(true); }}><ContentCopyRounded/></IconButton></Paper><Button href="/dashboard/integrations/react-native/quickstart" variant="outlined">View SDK integration guide</Button></Stack>}
              </div>
            </div>
            <div className="onboarding-chat-footer"><Typography variant="caption">Your progress is saved in this browser. You can return from the Onboarding Guide.</Typography><Button variant="contained" disabled={!canContinue} onClick={next} endIcon={<ArrowForwardRounded />}>{currentStep === 6 ? 'Finish setup' : currentStep === 5 && !pushEnabled ? 'Continue without push' : 'Continue'}{copied && currentStep === 6 ? ' · Prompt copied' : ''}</Button></div>
          </Paper>
          <aside className="onboarding-side-note"><div className="onboarding-orbit"><span><RocketLaunchRounded /></span><i/><b/></div><Typography variant="h6">A little setup now.<br/>A clearer picture later.</Typography><Typography color="text.secondary">Max will keep your place so you can pause and pick up whenever you’re ready.</Typography><div className="onboarding-side-foot"><ArrowBackRounded fontSize="small"/> No APIs connected in this onboarding preview</div></aside>
        </div>
        <Dialog open={firebaseDialogOpen} onClose={() => setFirebaseDialogOpen(false)} fullWidth maxWidth="sm" aria-labelledby="firebase-max-title">
          <DialogTitle id="firebase-max-title" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}><span className="max-avatar"><img src="/assets/agent-avatar-max-v4.png" alt="Max" /></span><span>Set up Firebase with Max<Typography component="small" display="block" color="text.secondary" fontSize={11} fontWeight={400}>PUSH NOTIFICATIONS · GUIDED PREVIEW</Typography></span></DialogTitle>
          <DialogContent dividers>
            <Stack gap={1.5}>
              <div className="max-message"><AutoAwesomeRounded fontSize="small"/><p>Let’s get Firebase Cloud Messaging ready together. Check each item as you complete it in your Firebase account. I won’t ask you to share private keys here.</p></div>
              <Paper elevation={0} className="firebase-max-checklist">
                {[
                  [1, 'Select the Firebase project for this app'],
                  [2, 'Enable Firebase Cloud Messaging'],
                  [3, 'Prepare credentials to add securely in PixlPush'],
                ].map(([step, label]) => <FormControlLabel key={step} control={<Checkbox checked={state.firebaseChecklist.includes(Number(step))} onChange={() => toggleFirebaseCheck(Number(step))}/>} label={label} />)}
              </Paper>
              <Alert severity="info">This is a guided UI preview only. Firebase authorization and credential saving are not connected yet.</Alert>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'space-between', p: 2 }}>
            <Button href="https://console.firebase.google.com" target="_blank" rel="noreferrer">Open Firebase Console</Button>
            <Button variant="contained" disabled={state.firebaseChecklist.length < 3} onClick={completeFirebaseWalkthrough}>Complete guided checklist</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
