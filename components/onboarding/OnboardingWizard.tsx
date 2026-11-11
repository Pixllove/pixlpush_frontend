'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import {
  ArrowBackRounded, ArrowForwardRounded, AutoAwesomeRounded, CheckCircleRounded, CheckRounded, CloudUploadRounded, ContentCopyRounded,
  CloseRounded, LanguageRounded, LockRounded, MailOutlineRounded, NotificationsActiveRounded, OpenInNewRounded, PhoneIphoneRounded,
  SearchRounded, WarningAmberRounded,
} from '@mui/icons-material';
import {
  Alert, Box, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, LinearProgress, Paper, Stack, TextField, Typography,
} from '@mui/material';
import { initialOnboardingState, isPushReady, type OnboardingState } from '@/lib/onboarding';
import { toggleProjectPlatform } from '@/lib/project-platforms';
import type { ProjectPlatform } from '@/types/project';
import { authApi, authKeys } from '@/lib/auth/api';
import { firebaseApi, onboardingApi, projectApi, projectKeys } from '@/lib/projects/api';
import { supportApi } from '@/lib/support/api';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import type { ApiError } from '@/types/auth';
import { createSendingDomain, listSendingDomains } from '@/lib/sending-domains/api';
import { domainErrorMessage } from '@/lib/sending-domains/errors';
import type { SendingDomain } from '@/types/sending-domain';
import { domainFromEmail } from '@/components/dashboard/sending-domains/AddDomainDialog';
import DomainAnalysisDialog from '@/components/dashboard/sending-domains/DomainAnalysisDialog';
import DnsSetupDialog from '@/components/dashboard/sending-domains/DnsSetupDialog';

const steps = [
  ['Project basics', 'Give your workspace a name'],
  ['Your products', 'Add your website or app links'],
  ['Channels', 'Choose how you’ll reach customers'],
  ['Domain', 'Prepare your sending domain'],
  ['Mobile push setup', 'Web: automatic · Mobile: Firebase'],
  ['SDK install', 'Bring product signals into PixlPush'],
];
const platformOptions: Array<{ id: ProjectPlatform; title: string; detail: string; icon: typeof LanguageRounded }> = [
  { id: 'web', title: 'Website', detail: 'For websites and web-based products.', icon: LanguageRounded },
  { id: 'mobile', title: 'Mobile App', detail: 'For apps available on iOS or Android.', icon: PhoneIphoneRounded },
];
const channelOptions: Array<{ id: string; title: string; detail: string; icon: typeof LanguageRounded; platform?: ProjectPlatform }> = [
  { id: 'web-push', title: 'Web push', detail: 'Reach opted-in visitors in their browser.', icon: NotificationsActiveRounded, platform: 'web' },
  { id: 'mobile-push', title: 'Mobile push', detail: 'Reach opted-in users on iOS and Android.', icon: NotificationsActiveRounded, platform: 'mobile' },
  { id: 'email', title: 'Email', detail: 'Send lifecycle and product updates.', icon: MailOutlineRounded },
  { id: 'in-app', title: 'In-app messages', detail: 'Show timely messages inside your product.', icon: PhoneIphoneRounded },
];
type SdkId = 'react-native' | 'flutter' | 'web' | 'wordpress' | 'php' | 'other';
type SdkSurface = 'mobile' | 'web';
const sdkOptions: Array<{ id: SdkId; title: string; detail: string; guide?: string }> = [
  { id: 'react-native', title: 'React Native / Expo', detail: 'Mobile apps with React Native or Expo.', guide: '/dashboard/integrations/react-native/quickstart' },
  { id: 'flutter', title: 'Flutter', detail: 'Cross-platform mobile apps built with Flutter.', guide: '/dashboard/integrations/flutter/quickstart' },
  { id: 'web', title: 'Web / JavaScript', detail: 'Websites and JavaScript applications.', guide: '/dashboard/integrations/web/quickstart' },
  { id: 'wordpress', title: 'WordPress', detail: 'WordPress sites and WooCommerce stores.', guide: '/dashboard/integrations/wordpress/quickstart' },
  { id: 'php', title: 'PHP', detail: 'PHP applications and server-rendered products.', guide: '/dashboard/integrations/php/quickstart' },
  { id: 'other', title: 'Other framework', detail: 'Request guidance for another framework.' },
];

const mobileSdkOptions = sdkOptions.filter((option) => ['react-native', 'flutter', 'other'].includes(option.id));
const websiteSdkOption = sdkOptions.find((option) => option.id === 'web') ?? sdkOptions[0];

const sdkPromptFor = (sdk: SdkId, projectName: string) => {
  const framework = sdkOptions.find((option) => option.id === sdk)?.title ?? 'your framework';
  return `You are a senior ${framework} engineer. Integrate PixlPush into the existing ${projectName || 'app'} for analytics, user identity, and push notifications.\n\nIMPORTANT — READ BEFORE CODING\n1. Inspect the repository to identify its framework, versions, package manager, app entry point, authentication flow, and existing Firebase or push setup.\n2. Use the official PixlPush SDK for ${framework} and follow the manual integration guide.\n3. Initialize it safely, register push permissions only when enabled, and track one first test event.\n4. Keep credentials and private keys out of source control, logs, and client-visible code.\n5. Explain the files changed and the verification steps when the integration is complete.`;
};

const websitePromptFor = (projectName: string) => `You are a senior web engineer. Integrate PixlPush into the existing ${projectName || 'website'} for analytics, user identity, and Web Push notifications.

IMPLEMENTATION PLAN
1. Inspect the project to identify its framework (for example Next.js, Nuxt, React, Vue, Vite, or plain HTML), package manager, build setup, and current service worker configuration.
2. Read the official PixlPush Web SDK documentation and use the latest verified package version from the registry.
3. Install and initialize the PixlPush Web SDK with the project key, identify authenticated users, and track a first test event.
4. Configure the PixlPush service worker, request notification permission from a user action, and test a real browser notification.
5. Keep keys and secrets out of source control, logs, and client-visible code. Explain every file changed and the verification steps when complete.`;

/** Progress saved before push was split into web and mobile stores 'push': expand it to the selected product types. */
function splitLegacyPush(channels: string[], platforms: ProjectPlatform[]) {
  if (!channels.includes('push')) return channels;
  const push = channelOptions.filter((option) => option.platform && platforms.includes(option.platform)).map((option) => option.id);
  return [...new Set(channels.flatMap((channel) => (channel === 'push' ? push : [channel])))];
}

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
  const [selectedSdk, setSelectedSdk] = useState<SdkId>('web');
  const [sdkSurface, setSdkSurface] = useState<SdkSurface>('mobile');
  const [sdkRequestOpen, setSdkRequestOpen] = useState(false);
  const [sdkRequestFramework, setSdkRequestFramework] = useState('');
  const [sdkRequestDetails, setSdkRequestDetails] = useState('');
  const [sdkRequestBusy, setSdkRequestBusy] = useState(false);
  const [sdkRequestMessage, setSdkRequestMessage] = useState('');
  const [developerEmail, setDeveloperEmail] = useState('');
  const [developerEmailBusy, setDeveloperEmailBusy] = useState(false);
  const [developerEmailMessage, setDeveloperEmailMessage] = useState('');
  const [firebaseDialogOpen, setFirebaseDialogOpen] = useState(false);
  const [firebaseFile, setFirebaseFile] = useState<{ name: string; text: string; projectId?: string; adminKey?: boolean }>();
  const [firebaseConfirm, setFirebaseConfirm] = useState('');
  const [firebaseError, setFirebaseError] = useState('');
  const [firebaseUploading, setFirebaseUploading] = useState(false);
  const [firebaseDropActive, setFirebaseDropActive] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [stepDirection, setStepDirection] = useState<'forward' | 'backward'>('forward');
  const [appLinkScanState, setAppLinkScanState] = useState<'idle' | 'checking' | 'found' | 'not-found' | 'error'>('idle');
  const [appLinkScanError, setAppLinkScanError] = useState('');
  const [domainVerificationBusy, setDomainVerificationBusy] = useState(false);
  const [domainVerificationError, setDomainVerificationError] = useState('');
  const [verificationProjectId, setVerificationProjectId] = useState<string | null>(null);
  const [domainDialog, setDomainDialog] = useState<
    { kind: 'none' } | { kind: 'analyze'; domain: SendingDomain } | { kind: 'dns'; domainId: string }
  >({ kind: 'none' });
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
  const sendingDomainsQuery = useQuery({
    queryKey: ['projects', 'sending-domains', projectId],
    queryFn: () => listSendingDomains(projectId!),
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
        channels: splitLegacyPush(progressQuery.data.channels, progressQuery.data.platforms),
        projectName: progressQuery.data.projectName || selectedProject?.name || previous.projectName,
      }));
    } else if (selectedProject?.name) {
      setState((previous) => ({ ...previous, projectName: selectedProject.name }));
    }
  }, [projectId, progressQuery.data, progressQuery.isFetching, progressQuery.isSuccess, selectedProject?.name]);

  const progressPayload = (value: OnboardingState): Partial<Omit<OnboardingState, 'projectName'>> => ({
    platforms: value.platforms,
    websiteUrl: value.websiteUrl,
    androidAppUrl: value.androidAppUrl,
    iosAppUrl: value.iosAppUrl,
    channels: value.channels,
    senderEmail: value.senderEmail,
    domain: value.domain,
    firebaseChecklist: value.firebaseChecklist,
    currentStep: value.currentStep,
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
  const firebaseConnected = firebaseQuery.data?.status === 'connected';
  const hasWeb = state.platforms.includes('web');
  const hasMobile = state.platforms.includes('mobile');
  useEffect(() => {
    if (hasMobile && !hasWeb) {
      setSdkSurface('mobile');
      setSelectedSdk((current) => mobileSdkOptions.some((option) => option.id === current) ? current : 'react-native');
    } else if (hasWeb && !hasMobile) {
      setSdkSurface('web');
      setSelectedSdk('web');
    } else if (hasMobile && hasWeb) {
      setSelectedSdk((current) => current === 'web' ? 'react-native' : current);
    }
  }, [hasMobile, hasWeb]);
  // Derive single-platform projects directly from the persisted Step 2 choice
  // so the correct Step 6 surface is rendered on the first paint. The local
  // tab state is only used when both product types are selected.
  const isWebsiteSurface = hasWeb && !hasMobile
    ? true
    : hasMobile && !hasWeb
      ? false
      : sdkSurface === 'web';
  const selectedSdkOption = isWebsiteSurface
    ? websiteSdkOption
    : (mobileSdkOptions.find((option) => option.id === selectedSdk) ?? mobileSdkOptions[0]);
  const sdkPrompt = isWebsiteSurface ? websitePromptFor(state.projectName) : sdkPromptFor(selectedSdkOption.id, state.projectName);
  // Push step: mobile needs Firebase, a website-only Project needs nothing.
  const pushReady = isPushReady(state.platforms, firebaseQuery.data?.status);
  const domain = state.domain.trim().toLowerCase();
  const domainOwnershipVerified = Boolean(
    domain && sendingDomainsQuery.data?.some(
      (sendingDomain) => sendingDomain.domain.trim().toLowerCase() === domain && sendingDomain.status === 'verified',
    ),
  );
  const stepIsComplete = (step: number) => {
    if (step === 1) return Boolean(state.projectName.trim());
    if (step === 2) return state.platforms.length > 0
      && (!hasWeb || Boolean(state.websiteUrl.trim()))
      && (!hasMobile || Boolean(state.androidAppUrl.trim() || state.iosAppUrl.trim()));
    if (step === 3) return state.channels.length > 0;
    if (step === 4) return Boolean(state.senderEmail.trim() && domain && domainOwnershipVerified);
    if (step === 5) return pushReady;
    // SDK completion is confirmed by backend SDK activity, never by Continue.
    return state.completed.includes(6);
  };
  const completedSteps = Array.from({ length: 6 }, (_, index) => index + 1).filter(stepIsComplete);
  const completedCount = completedSteps.length;
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
    localUserChange.current = true;
    setState((previous) => ({ ...previous, completed: previous.completed.filter((step) => step !== 5), skipped: false }));
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
    if (stepIsComplete(currentStep)) completed.add(currentStep);
    else completed.delete(currentStep);
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
  const checkForAppLinks = async () => {
    const raw = state.websiteUrl.trim();
    if (!raw || !projectId) return;
    setAppLinkScanState('checking');
    try {
      const links = await onboardingApi.appLinks(projectId, /^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      // Fill only empty fields: never overwrite a link the user typed.
      setState((previous) => ({
        ...previous,
        androidAppUrl: previous.androidAppUrl.trim() || links.androidAppUrl || '',
        iosAppUrl: previous.iosAppUrl.trim() || links.iosAppUrl || '',
      }));
      setAppLinkScanState(links.androidAppUrl || links.iosAppUrl ? 'found' : 'not-found');
    } catch (cause) {
      setAppLinkScanError((cause as ApiError).message || 'We couldn’t open that website.');
      setAppLinkScanState('error');
    }
  };
  const closeDomainDialog = () => {
    setDomainDialog({ kind: 'none' });
    setVerificationProjectId(null);
  };
  const openDomainVerification = async () => {
    const senderEmail = state.senderEmail.trim().toLowerCase();
    const domain = domainFromEmail(senderEmail);
    if (!domain) {
      setDomainVerificationError('Enter a valid sender email, for example info@yourproduct.com.');
      return;
    }
    setDomainVerificationBusy(true);
    setDomainVerificationError('');
    try {
      const verificationId = projectId ?? await ensureProject();
      if (!verificationId) return;
      setVerificationProjectId(verificationId);
      const existing = (await listSendingDomains(verificationId)).find((item) => item.domain.trim().toLowerCase() === domain);
      const sendingDomain = existing ?? await createSendingDomain(verificationId, { senderEmail });
      setDomainDialog({ kind: 'analyze', domain: sendingDomain });
    } catch (cause) {
      setDomainVerificationError(domainErrorMessage(cause));
    } finally {
      setDomainVerificationBusy(false);
    }
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
  const togglePlatform = (id: ProjectPlatform) => {
    localUserChange.current = true;
    setState((previous) => {
      const platforms = toggleProjectPlatform(previous.platforms, id);
      if (platforms === previous.platforms) return previous;
      // Drop the push channel of a product type that was just removed.
      const channels = previous.channels.filter((channel) => {
        const platform = channelOptions.find((option) => option.id === channel)?.platform;
        return !platform || platforms.includes(platform);
      });
      return { ...previous, platforms, channels, skipped: false };
    });
  };
  const toggleChannel = (id: string) => {
    localUserChange.current = true;
    setState((previous) => {
      const adding = !previous.channels.includes(id);
      return {
        ...previous,
        channels: adding ? [...previous.channels, id] : previous.channels.filter((x) => x !== id),
        skipped: false,
        ...(id === 'mobile-push' && adding ? { completed: previous.completed.filter((step) => step !== 5), firebaseChecklist: [] } : {}),
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

  const handleFirebaseDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setFirebaseDropActive(false);
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) void pickFirebaseFile(droppedFile);
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
      const nextState = { ...state, completed: [...new Set([...state.completed, 5])], firebaseChecklist: [1, 2, 3], skipped: false };
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

  // Continue is navigation, not a completion action. Incomplete steps remain
  // incomplete and can be finished later from the onboarding guide.
  const canContinue = true;
  const copySdkPrompt = async () => {
    try {
      await navigator.clipboard.writeText(sdkPrompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  const requestSdk = async () => {
    if (!projectId || !sdkRequestFramework.trim() || !sdkRequestDetails.trim()) return;
    setSdkRequestBusy(true);
    setSdkRequestMessage('');
    try {
      await supportApi.create({
        projectId,
        topic: 'technical',
        source: 'dashboard',
        subject: `SDK request: ${sdkRequestFramework.trim()}`,
        message: `Please add support for ${sdkRequestFramework.trim()}.\n\nRequest details:\n${sdkRequestDetails.trim()}`,
      });
      setSdkRequestMessage('Request sent. The PixlPush team will follow up in Help & Support.');
      setSdkRequestFramework('');
      setSdkRequestDetails('');
    } catch (cause) {
      setSdkRequestMessage((cause as Error).message || 'Could not send the SDK request. Please try again.');
    } finally {
      setSdkRequestBusy(false);
    }
  };
  const sendDeveloperInstructions = async () => {
    if (!projectId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(developerEmail.trim())) return;
    setDeveloperEmailBusy(true);
    setDeveloperEmailMessage('');
    try {
      const result = await onboardingApi.sendSdkInstructions(projectId, {
        developerEmail: developerEmail.trim(),
        sdk: isWebsiteSurface ? 'PixlPush Web SDK & Web Push' : selectedSdkOption.title,
        prompt: sdkPrompt,
        ...(selectedSdkOption.guide ? { guideUrl: `${window.location.origin}${selectedSdkOption.guide}` } : {}),
      });
      setDeveloperEmailMessage(result.sent ? 'Instructions sent to your developer.' : 'We could not send the instructions. Please try again.');
      if (result.sent) setDeveloperEmail('');
    } catch (cause) {
      setDeveloperEmailMessage((cause as Error).message || 'Could not send the instructions. Please try again.');
    } finally {
      setDeveloperEmailBusy(false);
    }
  };
  const firebaseProjectChange = Boolean(firebaseQuery.data?.firebaseProjectId && firebaseFile?.projectId && firebaseQuery.data.firebaseProjectId !== firebaseFile.projectId);
  const heading = ['What should we call your project?', 'Tell us about your products', 'Which channels do you want to use?', 'Let’s get your domain ready.', hasMobile ? 'Set up push for your app.' : 'Website push is ready.', isWebsiteSurface ? 'Add PixlPush to your website.' : 'Add the PixlPush SDK to your app.'][currentStep - 1];
  const questionEyebrow = currentStep === 6 && isWebsiteSurface
    ? 'STEP 06.2 · WEBSITE INTEGRATION'
    : `STEP ${String(currentStep).padStart(2, '0')} · ${steps[currentStep - 1][0].toUpperCase()}`;
  const prompt = [
    'I’m Max, your onboarding guide. Let’s start with a name for the product or workspace you’re setting up.',
    'Select the types of products you already have and add their links. We’ll tailor the next setup steps to your product portfolio.',
    'Choose every channel you plan to use. We’ll tailor the remaining setup to your selections.',
    'Enter the email address you want to use for sending emails (e.g., info@yourbrand.com). This is the address your recipients will see when they receive your emails.',
    hasMobile
      ? `Mobile apps send push through Firebase Cloud Messaging. Upload the service-account JSON and I’ll validate it securely.`
      : 'Good news: website push needs no Firebase and no keys. PixlPush sets it up automatically when the web SDK is installed.',
    'Install the SDK when you’re ready to send product events and register devices. Here’s a starter prompt you can share with your coding assistant.',
  ][currentStep - 1];

  return (
    <Box className="onboarding-shell">
      <Container maxWidth="lg" className="onboarding-container">
        <header className="onboarding-topbar">
          <a className="onboarding-brand" href="/" aria-label="PixlPush home">
            <Image className="onboarding-brand-logo" src="/assets/logo-dark-text.png" alt="PixlPush" width={174} height={43} priority />
          </a>
          <Button onClick={skip} variant="outlined" className="onboarding-skip">Skip setup <ArrowForwardRounded fontSize="small" /></Button>
        </header>

        <Box className="onboarding-progress-area">
          <Stack direction="row" justifyContent="space-between" alignItems="end" mb={1.5}>
            <Box><Typography className="onboarding-eyebrow">YOUR PIXLPUSH SETUP</Typography><Typography variant="h6" fontWeight={700}>A strong foundation, one step at a time</Typography></Box>
          <Typography variant="body2" color="text.secondary">{completedCount} of 6 complete</Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            // The wizard position advances when Continue is clicked. The
            // completion count and checkmarks remain based on real setup data.
            value={((currentStep - 1) / (steps.length - 1)) * 100}
            className="onboarding-progress"
          />
          <div className="onboarding-stepper">
            {steps.map(([title], index) => {
              const number = index + 1;
              const done = completedSteps.includes(number);
              const locked = false;
              return <button key={title} className={`onboarding-step${done ? ' is-done' : ''}${currentStep === number ? ' is-current' : ''}`} onClick={() => !locked && goToStep(number)} disabled={locked}>
                <span className="onboarding-step-number">{done ? <CheckRounded fontSize="small" /> : number}</span><span>{title}</span>
              </button>;
            })}
          </div>
        </Box>

        <div className="onboarding-workspace">
          <Paper elevation={0} className="onboarding-chat">
            <div className="onboarding-chat-head"><span className="max-avatar"><Image src="/assets/agent-avatar-max-v4.webp" alt="Max" width={52} height={52} /></span><span><strong>Max</strong><small>PIXLPUSH ONBOARDING GUIDE</small></span><Chip size="small" label="Ready to help" className="max-online" /></div>
            <div key={currentStep} className={`onboarding-chat-body onboarding-step-panel ${stepDirection}`}>
              <div className="max-message"><AutoAwesomeRounded fontSize="small" /><p>{prompt}</p></div>
              <div className="onboarding-question"><Typography className="onboarding-eyebrow">{questionEyebrow}</Typography><Typography variant="h4" className="onboarding-question-title">{heading}</Typography>
                {currentStep === 1 && <TextField autoFocus fullWidth label="Project name" placeholder="e.g. Northstar Mobile" value={state.projectName} onChange={(e) => patch({ projectName: e.target.value })} helperText="You can change this any time." />}
                {currentStep === 2 && <div className="onboarding-product-links">
                  <div className="onboarding-product-section-heading"><span className="onboarding-product-section-icon"><AutoAwesomeRounded /></span><span><strong>What types of products do you have?</strong><small>Select Website, Mobile App, or both. You can update this anytime in Project Settings.</small></span></div>
                  <div className="onboarding-product-options">{platformOptions.map(({ id, title, detail, icon: Icon }) => <button key={id} type="button" role="checkbox" aria-checked={state.platforms.includes(id)} className={`onboarding-channel${state.platforms.includes(id) ? ' selected' : ''}`} onClick={() => togglePlatform(id)}><span className="onboarding-channel-icon"><Icon /></span><span><strong>{title}</strong><small>{detail}</small></span>{state.platforms.includes(id) && <CheckRounded className="onboarding-channel-check"/>}</button>)}</div>
                  {state.platforms.length > 0 && <>
                  <div className="onboarding-product-section-heading"><span className="onboarding-product-section-icon"><LanguageRounded /></span><span><strong>Website</strong><small>Add the link to your existing website.</small></span></div>
                  <TextField fullWidth label="Website URL" placeholder="https://yourproduct.com" value={state.websiteUrl} onChange={(e) => updateWebsiteUrl(e.target.value)} />
                  </>}
                  {/* The website field is available for every product selection; scanning is useful whenever mobile app links are being collected. */}
                  {hasMobile && <Button className="onboarding-scan-button" variant="outlined" disabled={!state.websiteUrl.trim() || appLinkScanState === 'checking'} onClick={() => void checkForAppLinks()} startIcon={appLinkScanState === 'checking' ? <AutoAwesomeRounded className="onboarding-scan-icon" /> : <SearchRounded />}>
                    {appLinkScanState === 'checking' ? 'Checking for app links…' : 'Check for app links'}
                  </Button>}
                  {hasMobile && appLinkScanState !== 'idle' && <div className={`onboarding-link-scan ${appLinkScanState}`} role="status">
                    {appLinkScanState === 'found' ? <CheckCircleRounded /> : <WarningAmberRounded />}
                    <span><strong>{appLinkScanState === 'checking' ? 'Looking for app-store links' : appLinkScanState === 'found' ? 'App links found' : appLinkScanState === 'error' ? 'Couldn’t check this website' : 'No app links found'}</strong><small>{appLinkScanState === 'checking' ? 'Reading your website for Google Play and App Store links.' : appLinkScanState === 'found' ? 'We added the links we found below. Check them before you continue.' : appLinkScanState === 'error' ? `${appLinkScanError} You can add the links manually below.` : 'Your website doesn’t link to Google Play or the App Store. Add the links manually below.'}</small></span>
                  </div>}
                  {hasMobile && <>
                  <div className="onboarding-product-section-heading app-links-heading"><span className="onboarding-product-section-icon"><PhoneIphoneRounded /></span><span><strong>Mobile App</strong><small>Add your existing app store links.</small></span></div>
                  <div className="onboarding-app-link-grid"><TextField fullWidth label="Android App URL" placeholder="Google Play Store URL" value={state.androidAppUrl} onChange={(e) => patch({ androidAppUrl: e.target.value })}/><TextField fullWidth label="iOS App URL" placeholder="Apple App Store URL" value={state.iosAppUrl} onChange={(e) => patch({ iosAppUrl: e.target.value })}/></div>
                  </>}
                  {state.platforms.length > 0 && <Typography variant="body2" color="text.secondary">We’ll use these links to personalize your setup and guide you through the relevant next steps.</Typography>}
                </div>}
                {currentStep === 3 && <div className="onboarding-channel-grid">{channelOptions.filter((option) => !option.platform || state.platforms.includes(option.platform)).map(({ id, title, detail, icon: Icon }) => <button key={id} className={`onboarding-channel${state.channels.includes(id) ? ' selected' : ''}`} onClick={() => toggleChannel(id)}><span className="onboarding-channel-icon"><Icon /></span><span><strong>{title}</strong><small>{detail}</small></span>{state.channels.includes(id) && <CheckRounded className="onboarding-channel-check"/>}</button>)}</div>}
                {currentStep === 4 && <Stack gap={2} className="onboarding-domain-step">
                  <Typography className="onboarding-domain-question">Which email address would you like to send from?</Typography>
                  <div className="onboarding-domain-field-row">
                    <TextField fullWidth label="Sender email" placeholder="info@yourproduct.com" value={state.senderEmail} onChange={(e) => { const senderEmail = e.target.value; patch({ senderEmail, domain: domainFromEmail(senderEmail) ?? '' }); setDomainVerificationError(''); }} sx={{ '& .MuiOutlinedInput-root': { height: 56 } }} />
                    <Button variant="outlined" className="onboarding-domain-verify-button" sx={{ height: 56, minHeight: 56, maxHeight: 56, py: 0 }} onClick={() => void openDomainVerification()} disabled={domainVerificationBusy}>
                      {domainVerificationBusy ? 'Opening verification…' : 'Verify ownership'}
                    </Button>
                  </div>
                  {domainVerificationError && <Alert severity="error">{domainVerificationError}</Alert>}
                  {/* <Paper elevation={0} className="onboarding-guidance"><strong>What happens next?</strong><span>We’ll guide you through a few simple steps to verify your domain and get it ready for sending emails.</span><small>You can verify it later. We’ll save this sender address for now.</small></Paper> */}
                </Stack>}
                {currentStep === 5 && hasMobile && <Stack gap={2}><Paper elevation={0} className="onboarding-guidance"><strong>Firebase Cloud Messaging (mobile apps)</strong><span>Upload the Firebase service-account JSON used by this Project. PixlPush validates it with Google before encrypting and storing it.</span><small>Never paste credentials into chat or your app. The file is sent only to the authenticated backend.</small></Paper><Button variant="contained" onClick={openFirebaseWithMax} startIcon={<AutoAwesomeRounded />}>{firebaseConnected ? 'Review Firebase with Max' : 'Connect Firebase with Max'}</Button>{firebaseConnected && <Alert severity="success">Firebase is connected for this Project.</Alert>}</Stack>}
                {currentStep === 6 && <Stack gap={2.5} className="onboarding-sdk-step">
                  {hasWeb && hasMobile && <div className="onboarding-sdk-surface-tabs" role="tablist" aria-label="SDK integration type">
                    <button type="button" role="tab" aria-selected={!isWebsiteSurface} className={!isWebsiteSurface ? 'selected' : ''} onClick={() => { setSdkSurface('mobile'); setSelectedSdk((current) => mobileSdkOptions.some((option) => option.id === current) ? current : 'react-native'); }}>Mobile SDK</button>
                    <button type="button" role="tab" aria-selected={isWebsiteSurface} className={isWebsiteSurface ? 'selected' : ''} onClick={() => { setSdkSurface('web'); setSelectedSdk('web'); }}>Website SDK</button>
                  </div>}
                  <Typography className="onboarding-sdk-intro">{isWebsiteSurface ? 'Now let’s integrate PixlPush into your website. The Web SDK and Web Push are set up together in one guided flow. Copy the AI-ready prompt, follow the guide, or share the instructions with your developer.' : 'Let’s connect your mobile app to PixlPush. Copy the AI-ready prompt into your coding assistant, follow the manual guide, or share the instructions with your developer.'}</Typography>
                  {isWebsiteSurface ? <>
                    <Typography className="onboarding-website-subtitle" color="text.secondary">Set up analytics, user tracking, and Web Push notifications with one guided integration.</Typography>
                    <div className="onboarding-website-overview">
                      <div className="onboarding-website-overview-label"><LanguageRounded /><strong>One integration.<br />Two steps.</strong></div>
                      <div className="onboarding-website-overview-step"><span>1</span><div><strong>Web SDK Integration</strong><small>Install the PixlPush Web SDK, initialize it, identify users and track events.</small></div></div>
                      <ArrowForwardRounded className="onboarding-website-overview-arrow" />
                      <div className="onboarding-website-overview-step"><span>2</span><div><strong>Web Push Integration</strong><small>Configure the service worker, push subscription and notification permissions, then test a real browser notification.</small></div></div>
                    </div>
                  </> : <>
                    <div className="onboarding-sdk-selector">
                      <Typography className="onboarding-sdk-selector-title">What technology is your app built with?</Typography>
                      <Typography color="text.secondary" variant="body2">Select your framework to get the right integration instructions.</Typography>
                      <div className="onboarding-sdk-options">
                        {mobileSdkOptions.map((option) => <button key={option.id} type="button" className={`onboarding-sdk-option${selectedSdk === option.id ? ' selected' : ''}`} onClick={() => { setSelectedSdk(option.id); if (option.id === 'other') setSdkRequestOpen(true); }}>
                          <span className="onboarding-sdk-radio" aria-hidden="true">{selectedSdk === option.id && <span />}</span>
                          <span><strong>{option.title}</strong><small>{option.detail}</small></span>
                        </button>)}
                      </div>
                    </div>
                    <div className="onboarding-sdk-request-card"><div><strong>Need another SDK?</strong><small>Request an SDK for your framework. We’ll route it to Help & Support.</small></div><Button variant="outlined" onClick={() => setSdkRequestOpen(true)} endIcon={<ArrowForwardRounded />}>Request SDK</Button></div>
                  </>}
                  <Paper elevation={0} className="onboarding-sdk-prompt-panel">
                    <div className="onboarding-sdk-prompt-head"><div><strong>{isWebsiteSurface ? 'PIXLPUSH WEB SDK & WEB PUSH' : `PIXLPUSH ${selectedSdkOption.title.toUpperCase()} SDK`}</strong><small>{isWebsiteSurface ? 'AI-ready setup · Complete integration in one prompt' : 'AI-ready setup'}</small></div><Button size="small" onClick={() => void copySdkPrompt()} startIcon={<ContentCopyRounded />}>{copied ? 'Copied' : 'Copy'}</Button></div>
                    <code>{sdkPrompt}</code>
                  </Paper>
                  <Button variant="outlined" className="onboarding-sdk-copy-button" onClick={() => void copySdkPrompt()} startIcon={<ContentCopyRounded />}>{copied ? 'Prompt copied' : 'Copy AI Integration Prompt'}</Button>
                  <div className="onboarding-sdk-guide-row"><span><strong>Prefer manual setup?</strong><small>Open the {isWebsiteSurface ? 'website' : 'SDK'} integration guide.</small></span><Button component="a" href={selectedSdkOption.guide ?? '/dashboard/integrations'} target="_blank" rel="noreferrer" variant="outlined" endIcon={<OpenInNewRounded />}>View {isWebsiteSurface ? 'Website' : 'SDK'} integration guide</Button></div>
                  <div className="onboarding-sdk-developer"><Typography variant="h6">Or send instructions to your developer</Typography><Typography variant="body2" color="text.secondary">Share the setup instructions with the person responsible for your {isWebsiteSurface ? 'website' : 'app'}.</Typography><div className="onboarding-sdk-email-row"><TextField fullWidth type="email" placeholder="developer@company.com" value={developerEmail} onChange={(event) => { setDeveloperEmail(event.target.value); setDeveloperEmailMessage(''); }} /><Button variant="contained" disabled={developerEmailBusy || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(developerEmail.trim())} onClick={() => void sendDeveloperInstructions()} endIcon={<MailOutlineRounded />}>{developerEmailBusy ? 'Sending…' : 'Send'}</Button></div>{developerEmailMessage && <Alert severity={developerEmailMessage.includes('sent') ? 'success' : 'error'}>{developerEmailMessage}</Alert>}</div>
                </Stack>}
              </div>
            </div>
            <div className="onboarding-chat-footer">{saveError && <Alert severity="error" sx={{ mb: 1.5 }}>{saveError}</Alert>}<Typography variant="caption">Your progress is saved to this project. You can return from the Onboarding Guide on any device.</Typography><div className="onboarding-footer-actions">{currentStep > 1 && <Button variant="contained" className="onboarding-back-button" onClick={previous} startIcon={<ArrowBackRounded />}>Back</Button>}<Button variant="contained" disabled={!canContinue} onClick={next} endIcon={<ArrowForwardRounded />}>{currentStep === 6 ? 'Finish setup' : 'Continue'}</Button></div></div>
          </Paper>
          <aside className="onboarding-side-note"><div className="onboarding-orbit"><span><Image className="onboarding-orbit-logo" src="/assets/favicon.webp" alt="PixlPush" width={52} height={52} /></span><i/><b/></div><Typography variant="h6">A little setup now.<br/>A clearer picture later.</Typography><Typography color="text.secondary">Max will keep your place so you can pause and pick up whenever you’re ready.</Typography></aside>
        </div>
        <Dialog className="firebase-max-dialog" open={firebaseDialogOpen} onClose={() => setFirebaseDialogOpen(false)} fullWidth maxWidth="lg" aria-labelledby="firebase-max-title">
          <DialogTitle id="firebase-max-title" className="firebase-max-dialog-title">
            <div className="firebase-max-title-main">
              <span className="max-avatar"><Image src="/assets/agent-avatar-max-v4.webp" alt="Max" width={52} height={52} /></span>
              <span><strong>Connect Firebase with Max</strong><small>PUSH NOTIFICATIONS · SECURE CONNECTION</small></span>
            </div>
            <IconButton aria-label="Close Firebase setup" onClick={() => setFirebaseDialogOpen(false)}><CloseRounded /></IconButton>
          </DialogTitle>
          <DialogContent dividers className="firebase-max-dialog-content">
            <Typography className="firebase-guide-heading">How to find your Firebase Service Account JSON</Typography>
            <div className="firebase-guide-layout">
              <div className="firebase-guide-steps">
                <div className="firebase-guide-step"><span>1</span><div><strong>Open Firebase Console</strong><p>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer">console.firebase.google.com</a> and select your Firebase project.</p></div></div>
                <div className="firebase-guide-step"><span>2</span><div><strong>Open Project Settings</strong><p>Click the gear icon next to Project Overview and select <b>Project settings</b>.</p></div></div>
                <div className="firebase-guide-step"><span>3</span><div><strong>Go to Service Accounts</strong><p>Select the <b>Service accounts</b> tab at the top.</p></div></div>
                <div className="firebase-guide-step"><span>4</span><div><strong>Download your JSON file</strong><p>If you already have a Firebase Service Account JSON file, you can use it. Otherwise, click <b>Generate new private key</b> to download one.</p><div className="firebase-guide-note"><b>Don’t worry:</b> Generating a new private key won’t invalidate your existing keys or interrupt your current Firebase integrations. Everything will continue working as before.</div></div></div>
                <div className="firebase-guide-step"><span>5</span><div><strong>Upload the file to PixlPush</strong><p>Return here and upload your Service Account JSON file to securely connect your project.</p></div></div>
              </div>
              <div className="firebase-guide-gallery" aria-label="Firebase setup screenshots">
                <figure><span className="firebase-guide-image-number">1</span><Image src="/assets/firebase-guide-console-v2.png" alt="Firebase Console project selector" width={2172} height={724} /></figure>
                <figure><span className="firebase-guide-image-number">2</span><Image src="/assets/firebase-guide-settings-v2.png" alt="Firebase Project settings and Service accounts" width={2043} height={770} /></figure>
                <figure><span className="firebase-guide-image-number">3</span><Image src="/assets/firebase-guide-service-account-v2.png" alt="Firebase Generate new private key button" width={2172} height={724} /></figure>
              </div>
            </div>

            <div className="firebase-upload-panel">
              <div className="firebase-upload-panel-head"><div><strong>Choose your Firebase Service Account JSON</strong><span>Your file will be validated before connecting.</span></div><Chip size="small" label="Secure upload" /></div>
              <div
                className={`firebase-dropzone${firebaseDropActive ? ' is-active' : ''}${firebaseFile ? ' has-file' : ''}`}
                onDragOver={(event) => { event.preventDefault(); setFirebaseDropActive(true); }}
                onDragLeave={() => setFirebaseDropActive(false)}
                onDrop={handleFirebaseDrop}
              >
                <CloudUploadRounded />
                <strong>{firebaseFile ? firebaseFile.name : 'Drag and drop your JSON file here'}</strong>
                <span>{firebaseFile ? 'Ready to validate this service-account key.' : 'or choose a file from your device'}</span>
                <Button component="label" variant="outlined">Browse file<input type="file" accept="application/json,.json" hidden onChange={(event) => pickFirebaseFile(event.target.files?.[0])} /></Button>
              </div>
              {firebaseFile?.projectId && <Typography className="firebase-file-meta">Firebase project in this file: <b>{firebaseFile.projectId}</b></Typography>}
              {firebaseFile?.adminKey && <Alert severity="warning">This is Firebase’s default Admin key. It works, but a key limited to push sending is safer.</Alert>}
              {firebaseProjectChange && <TextField label={`Type "${firebaseFile?.projectId}" to confirm`} value={firebaseConfirm} onChange={(event) => setFirebaseConfirm(event.target.value)} autoComplete="off" fullWidth />}
              {firebaseError && <Alert severity="error">{firebaseError}</Alert>}
              <Alert severity="info" icon={<LockRounded />}>Your private key is sensitive. Credentials are encrypted and stored only in the PixlPush backend. They are never saved in browser storage.</Alert>
            </div>

          </DialogContent>
          <DialogActions className="firebase-max-dialog-actions">
            <Button href="https://console.firebase.google.com" target="_blank" rel="noreferrer" startIcon={<OpenInNewRounded />}>Open Firebase Console</Button>
            <Button variant="contained" disabled={!firebaseFile?.projectId || firebaseUploading || (firebaseProjectChange && firebaseConfirm.trim() !== firebaseFile.projectId)} onClick={uploadFirebase}>
              {firebaseUploading ? 'Validating…' : 'Validate & connect'}
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={sdkRequestOpen}
          onClose={() => { if (!sdkRequestBusy) setSdkRequestOpen(false); }}
          fullWidth
          maxWidth="sm"
          aria-labelledby="sdk-request-title"
        >
          <DialogTitle id="sdk-request-title" className="sdk-request-dialog-title">
            <div>
              <AutoAwesomeRounded />
              <span>
                <strong>Request an SDK</strong>
                <small>Tell us which framework you need and PixlPush support will follow up.</small>
              </span>
            </div>
            <IconButton aria-label="Close SDK request" onClick={() => setSdkRequestOpen(false)} disabled={sdkRequestBusy}>
              <CloseRounded />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Stack gap={2}>
              <TextField
                autoFocus
                fullWidth
                required
                label="Framework or platform"
                placeholder="e.g. Vue, Angular, Kotlin"
                value={sdkRequestFramework}
                onChange={(event) => { setSdkRequestFramework(event.target.value); setSdkRequestMessage(''); }}
              />
              <TextField
                fullWidth
                required
                multiline
                minRows={4}
                label="What should we support?"
                placeholder="Tell us about your app and the SDK integration you need."
                value={sdkRequestDetails}
                onChange={(event) => { setSdkRequestDetails(event.target.value); setSdkRequestMessage(''); }}
              />
              {sdkRequestMessage && <Alert severity={sdkRequestMessage.startsWith('Request sent') ? 'success' : 'error'}>{sdkRequestMessage}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSdkRequestOpen(false)} disabled={sdkRequestBusy}>Cancel</Button>
            <Button
              variant="contained"
              disabled={sdkRequestBusy || !sdkRequestFramework.trim() || !sdkRequestDetails.trim() || !projectId}
              onClick={() => void requestSdk()}
            >
              {sdkRequestBusy ? 'Sending…' : 'Send request'}
            </Button>
          </DialogActions>
        </Dialog>
        {domainDialog.kind === 'analyze' && verificationProjectId && <DomainAnalysisDialog
          projectId={verificationProjectId}
          domain={domainDialog.domain}
          onClose={closeDomainDialog}
          onChanged={() => {
            void Promise.all([
              queryClient.invalidateQueries({ queryKey: ['projects', 'sending-domains', verificationProjectId] }),
              queryClient.invalidateQueries({ queryKey: ['projects', verificationProjectId, 'onboarding'] }),
            ]);
          }}
          onManual={(domain) => setDomainDialog({ kind: 'dns', domainId: domain.id })}
        />}
        {domainDialog.kind === 'dns' && verificationProjectId && <DnsSetupDialog
          projectId={verificationProjectId}
          domainId={domainDialog.domainId}
          onClose={closeDomainDialog}
          onChanged={() => {
            void Promise.all([
              queryClient.invalidateQueries({ queryKey: ['projects', 'sending-domains', verificationProjectId] }),
              queryClient.invalidateQueries({ queryKey: ['projects', verificationProjectId, 'onboarding'] }),
            ]);
          }}
        />}
      </Container>
    </Box>
  );
}
