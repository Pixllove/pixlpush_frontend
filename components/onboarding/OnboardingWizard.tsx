'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowBackRounded, ArrowForwardRounded, AutoAwesomeRounded, CheckCircleRounded, CheckRounded, CloudUploadRounded, ContentCopyRounded,
  LanguageRounded, LockRounded, MailOutlineRounded, NotificationsActiveRounded, PhoneIphoneRounded, SearchRounded, WarningAmberRounded,
} from '@mui/icons-material';
import {
  Alert, Box, Button, Checkbox, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, IconButton, LinearProgress, Paper, Stack, TextField, Typography,
} from '@mui/material';
import { initialOnboardingState, type OnboardingState } from '@/lib/onboarding';
import { authApi, authKeys } from '@/lib/auth/api';
import { firebaseApi, onboardingApi, projectApi, projectKeys } from '@/lib/projects/api';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import type { ApiError } from '@/types/auth';

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
  const queryClient = useQueryClient();
  const { active: activeProject, projects, isPending: projectsPending, selectProject } = useActiveProject();
  const projectsQuery = useQuery({
    queryKey: projectKeys.list(),
    queryFn: projectApi.list,
    staleTime: 5 * 60_000,
  });
  const [state, setState] = useState<OnboardingState>(initialOnboardingState);
  const [copied, setCopied] = useState(false);
  const [firebaseDialogOpen, setFirebaseDialogOpen] = useState(false);
  const [firebaseFile, setFirebaseFile] = useState<{ name: string; text: string; projectId?: string; adminKey?: boolean }>();
  const [firebaseConfirm, setFirebaseConfirm] = useState('');
  const [firebaseError, setFirebaseError] = useState('');
  const [firebaseUploading, setFirebaseUploading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [stepDirection, setStepDirection] = useState<'forward' | 'backward'>('forward');
  const [appLinkScanState, setAppLinkScanState] = useState<'idle' | 'checking' | 'found' | 'not-found'>('idle');
  const hydratedProject = useRef<string | null>(null);
  const localUserChange = useRef(false);
  const savedProgress = useRef('');
  // The standalone /onboarding route does not render the dashboard selector,
  // so use the first accessible Project while Redux restores its selection.
  const selectedProject = activeProject ?? projects[0] ?? projectsQuery.data?.[0];
  const projectId = selectedProject?.id;
  const progressQuery = useQuery({
    queryKey: ['projects', projectId, 'onboarding'],
    queryFn: () => onboardingApi.get(projectId!),
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });
  const firebaseQuery = useQuery({
    queryKey: ['projects', projectId, 'firebase'],
    queryFn: () => firebaseApi.get(projectId!),
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!projectId || !progressQuery.isSuccess || progressQuery.isFetching || hydratedProject.current === projectId) return;
    hydratedProject.current = projectId;
    if (localUserChange.current) return;
    if (progressQuery.data) {
      setState((previous) => ({
        ...previous,
        ...progressQuery.data,
        projectName: progressQuery.data.projectName || selectedProject?.name || previous.projectName,
      }));
    } else if (selectedProject?.name) {
      setState((previous) => ({ ...previous, projectName: selectedProject.name }));
    }
  }, [projectId, progressQuery.data, progressQuery.isFetching, progressQuery.isSuccess, selectedProject?.name]);

  const progressPayload = (value: OnboardingState): Partial<Omit<OnboardingState, 'projectName'>> => ({
    websiteUrl: value.websiteUrl,
    androidAppUrl: value.androidAppUrl,
    iosAppUrl: value.iosAppUrl,
    channels: value.channels,
    domain: value.domain,
    firebaseChecklist: value.firebaseChecklist,
    currentStep: value.currentStep,
    completed: value.completed,
    skipped: value.skipped,
  });

  useEffect(() => {
    if (!projectId || hydratedProject.current !== projectId || !progressQuery.isSuccess || progressQuery.isFetching) return;
    const payload = progressPayload(state);
    const signature = JSON.stringify(payload);
    if (signature === savedProgress.current) return;
    const timer = window.setTimeout(() => {
      onboardingApi.update(projectId, payload)
        .then((saved) => {
          savedProgress.current = signature;
          queryClient.setQueryData(['projects', projectId, 'onboarding'], saved);
          setSaveError('');
        })
        .catch((cause: ApiError) => setSaveError(cause.message || 'Could not save onboarding progress.'));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [projectId, progressQuery.isFetching, progressQuery.isSuccess, queryClient, state]);

  const currentStep = Math.min(6, Math.max(1, state.currentStep));
  const pushEnabled = state.channels.includes('push');
  const completedCount = [...new Set(state.completed)].filter((step) => step !== 5 || pushEnabled).length + (pushEnabled ? 0 : 1);
  const goToStep = (step: number) => {
    localUserChange.current = true;
    setStepDirection(step >= currentStep ? 'forward' : 'backward');
    setState({ ...state, currentStep: step });
  };

  const patch = (value: Partial<OnboardingState>) => {
    localUserChange.current = true;
    setState((previous) => ({ ...previous, ...value, skipped: false }));
  };
  const openFirebaseWithMax = () => {
    if (!pushEnabled) {
      localUserChange.current = true;
      setState((previous) => ({
        ...previous,
        channels: previous.channels.includes('push') ? previous.channels : [...previous.channels, 'push'],
        completed: previous.completed.filter((step) => step !== 5),
        skipped: false,
      }));
    }
    setFirebaseDialogOpen(true);
  };
  const toggleFirebaseCheck = (step: number) => {
    localUserChange.current = true;
    setState((previous) => ({
      ...previous,
      firebaseChecklist: previous.firebaseChecklist.includes(step)
        ? previous.firebaseChecklist.filter((item) => item !== step)
        : [...previous.firebaseChecklist, step],
      skipped: false,
    }));
  };
  const next = async () => {
    localUserChange.current = true;
    const completed = new Set(state.completed);
    completed.add(currentStep);
    setStepDirection('forward');
    if (!selectedProject) {
      if (projectsPending || projectsQuery.isPending || !await ensureProject()) return;
    }
    if (currentStep === 6) {
      const finished = { ...state, completed: [...completed], currentStep: 6, skipped: false };
      setState(finished);
      router.push('/dashboard');
      return;
    }
    setState({ ...state, completed: [...completed], currentStep: currentStep + 1, skipped: false });
  };
  const previous = () => {
    if (currentStep === 1) return;
    localUserChange.current = true;
    setStepDirection('backward');
    setState({ ...state, currentStep: currentStep - 1, skipped: false });
  };
  const checkForAppLinks = () => {
    if (!state.websiteUrl.trim()) return;
    setAppLinkScanState('checking');
    window.setTimeout(() => {
      const hasAppLinks = Boolean(state.androidAppUrl.trim() || state.iosAppUrl.trim());
      setAppLinkScanState(hasAppLinks ? 'found' : 'not-found');
    }, 650);
  };
  const updateWebsiteUrl = (value: string) => {
    setAppLinkScanState('idle');
    patch({ websiteUrl: value });
  };
  const skip = async () => {
    const paused = { ...state, skipped: true };
    setState(paused);
    if (projectId) {
      onboardingApi.update(projectId, progressPayload(paused))
        .then((saved) => queryClient.setQueryData(['projects', projectId, 'onboarding'], saved))
        .catch(() => undefined);
    }
    try {
      await authApi.skipOnboarding();
      await queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
    } catch (cause) {
      setSaveError((cause as ApiError).message || 'Could not save your onboarding preference.');
      return;
    }
    router.push('/dashboard/onboarding');
  };
  const toggleChannel = (id: string) => {
    localUserChange.current = true;
    setState((previous) => {
      const adding = !previous.channels.includes(id);
      return {
        ...previous,
        channels: adding ? [...previous.channels, id] : previous.channels.filter((x) => x !== id),
        skipped: false,
        ...(id === 'push' && adding ? { completed: previous.completed.filter((step) => step !== 5), firebaseChecklist: [] } : {}),
      };
    });
  };

  const ensureProject = async () => {
    const name = state.projectName.trim();
    if (!name) return null;
    try {
      if (selectedProject) {
        if (selectedProject.name !== name) {
          await projectApi.update(selectedProject.id, { name });
          await queryClient.invalidateQueries({ queryKey: projectKeys.all });
        }
        return selectedProject.id;
      }
      const created = await projectApi.create({ name });
      await queryClient.invalidateQueries({ queryKey: projectKeys.all });
      await selectProject(created.id);
      hydratedProject.current = created.id;
      const payload = progressPayload(state);
      const saved = await onboardingApi.update(created.id, payload);
      queryClient.setQueryData(['projects', created.id, 'onboarding'], saved);
      savedProgress.current = JSON.stringify(payload);
      return created.id;
    } catch (cause) {
      setSaveError((cause as ApiError).message || 'Could not create or update the Project.');
      return null;
    }
  };

  const pickFirebaseFile = async (picked?: File) => {
    setFirebaseError('');
    setFirebaseFile(undefined);
    if (!picked) return;
    const text = await picked.text();
    let projectIdFromFile: string | undefined;
    let adminKey = false;
    try {
      const parsed = JSON.parse(text) as { project_id?: unknown; client_email?: unknown; project_info?: unknown };
      projectIdFromFile = typeof parsed.project_id === 'string' ? parsed.project_id : undefined;
      adminKey = typeof parsed.client_email === 'string' && parsed.client_email.startsWith('firebase-adminsdk');
      if (!projectIdFromFile) {
        setFirebaseError(parsed.project_info
          ? 'This is google-services.json. Upload the Firebase service-account key JSON instead.'
          : 'This file is not a valid service-account key because it has no project_id.');
      }
    } catch {
      setFirebaseError('This file is not valid JSON.');
    }
    setFirebaseFile({ name: picked.name, text, projectId: projectIdFromFile, adminKey });
  };

  const uploadFirebase = async () => {
    if (!projectId || !firebaseFile?.projectId) return;
    setFirebaseError('');
    setFirebaseUploading(true);
    try {
      const existing = firebaseQuery.data?.firebaseProjectId;
      const isSwitch = Boolean(existing && existing !== firebaseFile.projectId);
      if (isSwitch && firebaseConfirm.trim() !== firebaseFile.projectId) {
        setFirebaseError(`Type ${firebaseFile.projectId} to confirm changing Firebase projects.`);
        return;
      }
      await firebaseApi.upload(projectId, {
        serviceAccount: firebaseFile.text,
        ...(isSwitch ? { confirmFirebaseProjectId: firebaseConfirm.trim() } : {}),
      });
      await queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'firebase'] });
      const nextState = { ...state, channels: state.channels.includes('push') ? state.channels : [...state.channels, 'push'], completed: [...new Set([...state.completed, 5])], firebaseChecklist: [1, 2, 3], skipped: false };
      setState(nextState);
      setFirebaseFile(undefined);
      setFirebaseConfirm('');
      setFirebaseDialogOpen(false);
    } catch (cause) {
      setFirebaseError((cause as ApiError).message || 'Could not connect Firebase. Please try again.');
    } finally {
      setFirebaseUploading(false);
    }
  };

  const canContinue = currentStep === 1 ? Boolean(state.projectName.trim()) && !projectsPending && !projectsQuery.isPending : currentStep === 3 ? state.channels.length > 0 : currentStep === 5 && pushEnabled ? state.completed.includes(5) : true;
  const firebaseProjectChange = Boolean(firebaseQuery.data?.firebaseProjectId && firebaseFile?.projectId && firebaseQuery.data.firebaseProjectId !== firebaseFile.projectId);
  const heading = currentStep === 5 && !pushEnabled ? 'No push setup needed right now.' : ['What should we call your project?', 'Where can customers find your product?', 'Which channels do you want to use?', 'Let’s get your domain ready.', 'Set up push with Firebase.', 'Add the PixlPush SDK to your app.'][currentStep - 1];
  const prompt = currentStep === 5 && !pushEnabled ? 'You haven’t selected push notifications, so we can leave Firebase for later. Let’s move on to SDK setup.' : [
    'I’m Max, your onboarding guide. Let’s start with a name for the product or workspace you’re setting up.',
    'Great start. Share a public website or app-store link so we can keep this setup focused on your product. No business analysis is needed.',
    'Choose every channel you plan to use. We’ll tailor the remaining setup to your selections.',
    'A sending domain helps your email reach the inbox and look like it came from your brand. Add the domain you plan to use; this demo won’t change DNS.',
    'Push notifications need Firebase Cloud Messaging credentials. Upload the service-account JSON and I’ll validate it securely for this Project.',
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
              const done = number < currentStep && state.completed.includes(number) && !notNeeded;
              const locked = number > currentStep;
              return <button key={title} className={`onboarding-step${done ? ' is-done' : ''}${notNeeded ? ' is-not-needed' : ''}${currentStep === number ? ' is-current' : ''}`} onClick={() => !locked && goToStep(number)} disabled={locked}>
                <span className="onboarding-step-number">{done ? <CheckRounded fontSize="small" /> : notNeeded ? '–' : number}</span><span>{title}{notNeeded ? ' · Not needed' : ''}</span>
              </button>;
            })}
          </div>
        </Box>

        <div className="onboarding-workspace">
          <Paper elevation={0} className="onboarding-chat">
            <div className="onboarding-chat-head"><span className="max-avatar"><img src="/assets/agent-avatar-max-v4.png" alt="Max" /></span><span><strong>Max</strong><small>PIXLPUSH ONBOARDING GUIDE</small></span><Chip size="small" label="Ready to help" className="max-online" /></div>
            <div key={currentStep} className={`onboarding-chat-body onboarding-step-panel ${stepDirection}`}>
              <div className="max-message"><AutoAwesomeRounded fontSize="small" /><p>{prompt}</p></div>
              <div className="onboarding-question"><Typography className="onboarding-eyebrow">STEP {String(currentStep).padStart(2, '0')} · {steps[currentStep - 1][0].toUpperCase()}</Typography><Typography variant="h4" className="onboarding-question-title">{heading}</Typography>
                {currentStep === 1 && <TextField autoFocus fullWidth label="Project name" placeholder="e.g. Northstar Mobile" value={state.projectName} onChange={(e) => patch({ projectName: e.target.value })} helperText="You can change this any time." />}
                {currentStep === 2 && <div className="onboarding-product-links">
                  <div className="onboarding-product-section-heading"><span className="onboarding-product-section-icon"><LanguageRounded /></span><span><strong>Website</strong><small>Start with your public product website</small></span></div>
                  <TextField fullWidth label="Website link" placeholder="https://yourproduct.com" value={state.websiteUrl} onChange={(e) => updateWebsiteUrl(e.target.value)} />
                  <Button className="onboarding-scan-button" variant="outlined" disabled={!state.websiteUrl.trim() || appLinkScanState === 'checking'} onClick={checkForAppLinks} startIcon={appLinkScanState === 'checking' ? <AutoAwesomeRounded className="onboarding-scan-icon" /> : <SearchRounded />}>
                    {appLinkScanState === 'checking' ? 'Checking for app links…' : 'Check for app links'}
                  </Button>
                  {appLinkScanState !== 'idle' && <div className={`onboarding-link-scan ${appLinkScanState}`} role="status">
                    {appLinkScanState === 'found' ? <CheckCircleRounded /> : <WarningAmberRounded />}
                    <span><strong>{appLinkScanState === 'checking' ? 'Looking for app-store links' : appLinkScanState === 'found' ? 'App link found' : 'No app links found'}</strong><small>{appLinkScanState === 'checking' ? 'Reviewing the website details in this preview.' : appLinkScanState === 'found' ? 'We found an app link in the details below.' : 'No app-store links were found yet. You can add them manually below.'}</small></span>
                  </div>}
                  <div className="onboarding-product-section-heading app-links-heading"><span className="onboarding-product-section-icon"><AutoAwesomeRounded /></span><span><strong>App links</strong><small>Add or confirm your mobile app store links</small></span></div>
                  <div className="onboarding-app-link-grid"><TextField fullWidth label="Android app link" placeholder="Google Play Store URL" value={state.androidAppUrl} onChange={(e) => patch({ androidAppUrl: e.target.value })}/><TextField fullWidth label="iOS app link" placeholder="Apple App Store URL" value={state.iosAppUrl} onChange={(e) => patch({ iosAppUrl: e.target.value })}/></div>
                  <Alert severity="info" icon={<LanguageRounded />}>We’ll use these links only as setup context—no business analysis.</Alert>
                </div>}
                {currentStep === 3 && <div className="onboarding-channel-grid">{channelOptions.map(({ id, title, detail, icon: Icon }) => <button key={id} className={`onboarding-channel${state.channels.includes(id) ? ' selected' : ''}`} onClick={() => toggleChannel(id)}><span className="onboarding-channel-icon"><Icon /></span><span><strong>{title}</strong><small>{detail}</small></span>{state.channels.includes(id) && <CheckRounded className="onboarding-channel-check"/>}</button>)}</div>}
                {currentStep === 4 && <Stack gap={2}><TextField fullWidth label="Sending domain" placeholder="mail.yourproduct.com" value={state.domain} onChange={(e) => patch({ domain: e.target.value })}/><Paper elevation={0} className="onboarding-guidance"><strong>What you’ll do later</strong><span>Verify ownership · Add DNS records · Confirm authentication</span><small>This is a guided preview only. No DNS records are created or verified here.</small></Paper></Stack>}
                {currentStep === 5 && (pushEnabled ? <Stack gap={2}><Paper elevation={0} className="onboarding-guidance"><strong>Firebase Cloud Messaging</strong><span>Upload the Firebase service-account JSON used by this Project. PixlPush validates it with Google before encrypting and storing it.</span><small>Never paste credentials into chat or your app. The file is sent only to the authenticated backend.</small></Paper><Button variant="contained" onClick={openFirebaseWithMax} startIcon={<AutoAwesomeRounded />}>{state.completed.includes(5) ? 'Review Firebase with Max' : 'Connect Firebase with Max'}</Button>{state.completed.includes(5) && <Alert severity="success">Firebase is connected for this Project.</Alert>}</Stack> : <Stack gap={2}><Alert severity="info" icon={<NotificationsActiveRounded />}>Push notifications weren’t selected. You can still add push now and set up Firebase.</Alert><Button variant="contained" onClick={openFirebaseWithMax} startIcon={<AutoAwesomeRounded />}>Enable push &amp; set up Firebase</Button></Stack>)}
                {currentStep === 6 && <Stack gap={2}><Paper elevation={0} className="onboarding-code"><code>Set up the PixlPush SDK in my {state.projectName || 'app'}. Guide me through installation, initialize it safely, register push permissions if enabled, and track a first test event. Do not expose secrets.</code><IconButton aria-label="Copy setup prompt" onClick={() => { navigator.clipboard?.writeText(`Set up the PixlPush SDK in my ${state.projectName || 'app'}. Guide me through installation, initialize it safely, register push permissions if enabled, and track a first test event. Do not expose secrets.`); setCopied(true); }}><ContentCopyRounded/></IconButton></Paper><Button href="/dashboard/integrations/react-native/quickstart" variant="outlined">View SDK integration guide</Button></Stack>}
              </div>
            </div>
            <div className="onboarding-chat-footer">{saveError && <Alert severity="error" sx={{ mb: 1.5 }}>{saveError}</Alert>}<Typography variant="caption">Your progress is saved to this project. You can return from the Onboarding Guide on any device.</Typography><div className="onboarding-footer-actions">{currentStep > 1 && <Button variant="contained" className="onboarding-back-button" onClick={previous} startIcon={<ArrowBackRounded />}>Back</Button>}<Button variant="contained" disabled={!canContinue} onClick={next} endIcon={<ArrowForwardRounded />}>{currentStep === 6 ? 'Finish setup' : currentStep === 5 && !pushEnabled ? 'Continue without push' : 'Continue'}{copied && currentStep === 6 ? ' · Prompt copied' : ''}</Button></div></div>
          </Paper>
          <aside className="onboarding-side-note"><div className="onboarding-orbit"><span><img className="onboarding-orbit-logo" src="/assets/favicon.png" alt="PixlPush" /></span><i/><b/></div><Typography variant="h6">A little setup now.<br/>A clearer picture later.</Typography><Typography color="text.secondary">Max will keep your place so you can pause and pick up whenever you’re ready.</Typography></aside>
        </div>
        <Dialog open={firebaseDialogOpen} onClose={() => setFirebaseDialogOpen(false)} fullWidth maxWidth="sm" aria-labelledby="firebase-max-title">
          <DialogTitle id="firebase-max-title" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}><span className="max-avatar"><img src="/assets/agent-avatar-max-v4.png" alt="Max" /></span><span>Set up Firebase with Max<Typography component="small" display="block" color="text.secondary" fontSize={11} fontWeight={400}>PUSH NOTIFICATIONS · SECURE CONNECTION</Typography></span></DialogTitle>
          <DialogContent dividers>
            <Stack gap={1.5}>
              <div className="max-message"><AutoAwesomeRounded fontSize="small"/><p>Upload the Firebase service-account JSON. PixlPush validates it with Google before encrypting and saving it to this Project.</p></div>
              <Paper elevation={0} className="firebase-max-checklist">
                {[
                  [1, 'Select the Firebase project for this app'],
                  [2, 'Enable Firebase Cloud Messaging'],
                  [3, 'Upload and validate the service-account JSON'],
                ].map(([step, label]) => <FormControlLabel key={step} control={<Checkbox checked={state.firebaseChecklist.includes(Number(step))} onChange={() => toggleFirebaseCheck(Number(step))}/>} label={label} />)}
              </Paper>
              <Button component="label" variant="outlined" startIcon={<CloudUploadRounded />}>
                {firebaseFile ? firebaseFile.name : 'Choose service-account JSON'}
                <input type="file" accept="application/json,.json" hidden onChange={(event) => pickFirebaseFile(event.target.files?.[0])} />
              </Button>
              {firebaseFile?.projectId && <Typography fontSize="var(--fs-12)" color="text.secondary">Firebase project in this file: <b>{firebaseFile.projectId}</b></Typography>}
              {firebaseFile?.adminKey && <Alert severity="warning">This is Firebase’s default Admin key. It works, but a key limited to push sending is safer.</Alert>}
              {firebaseProjectChange && <TextField label={`Type "${firebaseFile?.projectId}" to confirm`} value={firebaseConfirm} onChange={(event) => setFirebaseConfirm(event.target.value)} autoComplete="off" fullWidth />}
              {firebaseError && <Alert severity="error">{firebaseError}</Alert>}
              <Alert severity="info" icon={<LockRounded />}>Credentials are encrypted and stored only in the PixlPush backend. They are never saved in browser storage.</Alert>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'space-between', p: 2 }}>
            <Button href="https://console.firebase.google.com" target="_blank" rel="noreferrer">Open Firebase Console</Button>
            <Button variant="contained" disabled={!firebaseFile?.projectId || firebaseUploading || (firebaseProjectChange && firebaseConfirm.trim() !== firebaseFile.projectId)} onClick={uploadFirebase}>
              {firebaseUploading ? 'Validating…' : 'Validate and connect'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
