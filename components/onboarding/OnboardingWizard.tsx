'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import {
  ArrowBackRounded, ArrowForwardRounded, AutoAwesomeRounded, CheckRounded,
} from '@mui/icons-material';
import {
  Alert, Box, Button, Chip, Container, LinearProgress, Paper, Stack, Typography,
} from '@mui/material';
import { initialOnboardingState, isPushReady, normalizeOnboardingUrl, normalizeOnboardingUrls, onboardingStepsOf, onboardingUrlError, type OnboardingState, type OnboardingUrlField } from '@/lib/onboarding';
import { toggleProjectPlatform } from '@/lib/project-platforms';
import type { ProjectPlatform } from '@/types/project';
import { authApi, authKeys } from '@/lib/auth/api';
import { firebaseApi, onboardingApi, projectApi, projectKeys } from '@/lib/projects/api';
import ApnsConnectDialog from '@/components/dashboard/ApnsConnectDialog';
import FirebaseConnectDialog from './FirebaseConnectDialog';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import type { ApiError } from '@/types/auth';
import { createSendingDomain, listSendingDomains } from '@/lib/sending-domains/api';
import { domainErrorMessage } from '@/lib/sending-domains/errors';
import type { SendingDomain } from '@/types/sending-domain';
import { domainFromEmail } from '@/components/dashboard/sending-domains/AddDomainDialog';
import DomainAnalysisDialog from '@/components/dashboard/sending-domains/DomainAnalysisDialog';
import DnsSetupDialog from '@/components/dashboard/sending-domains/DnsSetupDialog';
import { channelOptions, onboardingHeadingByKind, onboardingPromptByKind } from './onboardingStepConfig';
import OnboardingCommonStep, { type WebsiteCheckState } from './OnboardingCommonStep';
import OnboardingStepExperience, { SdkRequestDialog } from './OnboardingStepExperience';

/** Progress saved before push was split into web and mobile stores 'push': expand it to the selected product types. */
function splitLegacyPush(channels: string[], platforms: ProjectPlatform[]) {
  if (!channels.includes('push')) return channels;
  const push = channelOptions.filter((option) => option.platform && platforms.includes(option.platform)).map((option) => option.id);
  return [...new Set(channels.flatMap((channel) => (channel === 'push' ? push : [channel])))];
}

/** Preserve completion by semantic step when channel changes move its number. */
function remapCompletedSteps(state: OnboardingState, platforms: ProjectPlatform[], channels: string[]) {
  const previousSteps = onboardingStepsOf(state.platforms, state.channels);
  const nextSteps = onboardingStepsOf(platforms, channels);
  return state.completed.flatMap((number) => {
    const kind = previousSteps[number - 1]?.kind;
    const nextNumber = kind ? nextSteps.findIndex((step) => step.kind === kind) + 1 : 0;
    return nextNumber > 0 ? [nextNumber] : [];
  });
}

export default function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createdProjectEntry = searchParams.get('source') === 'project-created';
  const resumeRequested = searchParams.get('resume') === '1';
  const queryClient = useQueryClient();
  const { active: activeProject, projects, isPending: projectsPending, selectProject } = useActiveProject();
  const projectsQuery = useQuery({
    queryKey: projectKeys.list(),
    queryFn: projectApi.list,
    staleTime: 5 * 60_000,
  });
  const [state, setState] = useState<OnboardingState>(initialOnboardingState);
  const [sdkRequestOpen, setSdkRequestOpen] = useState(false);
  const [firebaseDialogOpen, setFirebaseDialogOpen] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [stepDirection, setStepDirection] = useState<'forward' | 'backward'>('forward');
  const [appLinkScanState, setAppLinkScanState] = useState<'idle' | 'checking' | 'found' | 'not-found' | 'error'>('idle');
  const [appLinkScanError, setAppLinkScanError] = useState('');
  const [detectedAppLinks, setDetectedAppLinks] = useState<{ androidAppUrl: string | null; iosAppUrl: string | null }>({ androidAppUrl: null, iosAppUrl: null });
  const [urlErrors, setUrlErrors] = useState<Partial<Record<OnboardingUrlField, string>>>({});
  const [websiteCheckState, setWebsiteCheckState] = useState<WebsiteCheckState>('idle');
  const [websiteCheckMessage, setWebsiteCheckMessage] = useState('');
  const [verifiedWebsiteUrl, setVerifiedWebsiteUrl] = useState('');
  const [productsError, setProductsError] = useState('');
  const [productsSaving, setProductsSaving] = useState(false);
  const [domainVerificationBusy, setDomainVerificationBusy] = useState(false);
  const [domainVerificationError, setDomainVerificationError] = useState('');
  const [verificationProjectId, setVerificationProjectId] = useState<string | null>(null);
  const [domainDialog, setDomainDialog] = useState<
    { kind: 'none' } | { kind: 'analyze'; domain: SendingDomain } | { kind: 'dns'; domainId: string }
  >({ kind: 'none' });
  const reportSaveError = useCallback((cause: unknown, fallback: string) => {
    const message = (cause as ApiError).message || fallback;
    if (/website url must point to a public website/i.test(message)) {
      setUrlErrors((previous) => ({ ...previous, websiteUrl: message }));
      setSaveError('');
      return;
    }
    setSaveError(message);
  }, []);
  const hydratedProject = useRef<string | null>(null);
  const localUserChange = useRef(false);
  const savedProgress = useRef('');
  // The standalone /onboarding route does not render the dashboard selector,
  // so use the first accessible Project while Redux restores its selection.
  const selectedProject = activeProject ?? projects[0] ?? projectsQuery.data?.[0];
  const projectId = selectedProject?.id;
  const resumeProgress = projectId ? queryClient.getQueryData<OnboardingState>(['projects', projectId, 'onboarding']) : undefined;
  const progressQuery = useQuery({
    queryKey: ['projects', projectId, 'onboarding'],
    queryFn: () => onboardingApi.get(projectId!),
    enabled: Boolean(projectId),
    staleTime: 30_000,
    initialData: resumeRequested ? resumeProgress : undefined,
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
      const persisted = progressQuery.data;
      const persistedSteps = onboardingStepsOf(persisted.platforms, persisted.channels);
      setState((previous) => ({
        ...previous,
        ...persisted,
        currentStep: createdProjectEntry ? Math.min(2, persistedSteps.length) : persisted.currentStep,
        channels: splitLegacyPush(persisted.channels, persisted.platforms),
        projectName: persisted.projectName || selectedProject?.name || previous.projectName,
      }));
      if (createdProjectEntry) router.replace('/onboarding');
    } else if (selectedProject?.name) {
      setState((previous) => ({ ...previous, projectName: selectedProject.name }));
    }
  }, [createdProjectEntry, projectId, progressQuery.data, progressQuery.isFetching, progressQuery.isSuccess, router, selectedProject?.name]);

  const progressPayload = (value: OnboardingState): Partial<Omit<OnboardingState, 'projectName'>> => {
    const normalized = normalizeOnboardingUrls(value);
    return {
      platforms: normalized.platforms,
      websiteUrl: normalized.websiteUrl,
      androidAppUrl: normalized.androidAppUrl,
      iosAppUrl: normalized.iosAppUrl,
      channels: normalized.channels,
      senderEmail: normalized.senderEmail,
      domain: normalized.domain,
      firebaseChecklist: normalized.firebaseChecklist,
      deferredSteps: normalized.deferredSteps,
      currentStep: normalized.currentStep,
      skipped: normalized.skipped,
    };
  };

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
        .catch((cause: ApiError) => reportSaveError(cause, 'Could not save onboarding progress.'));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [projectId, progressQuery.isFetching, progressQuery.isSuccess, queryClient, reportSaveError, state]);

  const steps = onboardingStepsOf(state.platforms, state.channels);
  const stepCount = steps.length;
  // Clamped: changing product/channel selections can remove later steps.
  const currentStep = Math.min(stepCount, Math.max(1, state.currentStep));
  const activeStep = steps[currentStep - 1];

  // Each step can be much taller than the viewport (especially the SDK steps).
  // Reset the document scroll after the new step has rendered so Continue,
  // Back, and direct step navigation always start at the top of the step.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [currentStep]);

  const firebaseConnected = firebaseQuery.data?.status === 'connected';
  const hasMobile = state.platforms.includes('mobile');
  const isSdkStep = activeStep.kind === 'app-sdk' || activeStep.kind === 'web-sdk';
  // Push step: mobile needs Firebase or an APNs key (iOS without Firebase); a website-only Project needs nothing.
  const apnsConnected = firebaseQuery.data?.apns?.status === 'connected';
  const pushReady = isPushReady(state.platforms, firebaseQuery.data?.status, firebaseQuery.data?.apns?.status);
  const stepIsCompleteFor = (candidate: OnboardingState, step: number) => {
    const candidateSteps = onboardingStepsOf(candidate.platforms, candidate.channels);
    const kind = candidateSteps[step - 1]?.kind;
    const candidateHasWeb = candidate.platforms.includes('web');
    const candidateHasMobile = candidate.platforms.includes('mobile');
    const candidateDomain = candidate.domain.trim().toLowerCase();
    const candidateDomainVerified = Boolean(
      candidateDomain && sendingDomainsQuery.data?.some(
        (sendingDomain) => sendingDomain.domain.trim().toLowerCase() === candidateDomain && sendingDomain.status === 'verified',
      ),
    );
    if (kind === 'basics') return Boolean(candidate.projectName.trim());
    if (kind === 'products') return candidate.platforms.length > 0
      && (!candidateHasWeb || Boolean(candidate.websiteUrl.trim()))
      && (!candidateHasMobile || Boolean(candidate.androidAppUrl.trim() || candidate.iosAppUrl.trim()));
    if (kind === 'channels') return candidate.channels.length > 0;
    if (kind === 'domain') return Boolean(candidate.senderEmail.trim() && candidateDomain && candidateDomainVerified);
    if (kind === 'mobile-push') return pushReady;
    // SDK completion is confirmed by backend SDK activity, never by Continue.
    return candidate.completed.includes(step);
  };
  const stepIsComplete = (step: number) => stepIsCompleteFor(state, step);
  const completedSteps = Array.from({ length: stepCount }, (_, index) => index + 1).filter(stepIsComplete);
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
  const [apnsDialogOpen, setApnsDialogOpen] = useState(false);
  /** Connecting APNs completes the Mobile push step, the same as connecting Firebase. */
  const markMobilePushDone = () => {
    const mobilePushStep = onboardingStepsOf(state.platforms, state.channels).findIndex((step) => step.kind === 'mobile-push') + 1;
    if (mobilePushStep > 0) setState({ ...state, completed: [...new Set([...state.completed, mobilePushStep])], skipped: false });
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
    setStepDirection('forward');
    let currentState = normalizeOnboardingUrls(state);
    if (currentStep === 2) {
      const nextUrlErrors: Partial<Record<OnboardingUrlField, string>> = {};
      (['websiteUrl', 'androidAppUrl', 'iosAppUrl'] as const).forEach((field) => {
        const error = onboardingUrlError(currentState[field], field === 'websiteUrl' ? 'Website URL' : field === 'androidAppUrl' ? 'Android app link' : 'iOS app link');
        if (error) nextUrlErrors[field] = error;
      });
      const missingWebsite = currentState.platforms.includes('web') && !currentState.websiteUrl.trim();
      const missingMobileLink = currentState.platforms.includes('mobile') && !currentState.androidAppUrl.trim() && !currentState.iosAppUrl.trim();
      setUrlErrors(nextUrlErrors);
      setProductsError(missingWebsite ? 'Add a website URL for the selected Website product.' : missingMobileLink ? 'Add an Android or iOS app link for the selected Mobile App product.' : '');
      setState(currentState);
      if (Object.keys(nextUrlErrors).length || missingWebsite || missingMobileLink) return;
      if (currentState.platforms.includes('web') && currentState.websiteUrl.trim() && verifiedWebsiteUrl !== currentState.websiteUrl) {
        const check = await verifyWebsiteDomain(currentState.websiteUrl);
        if (check === 'not_found') return;
      }
    }
    const completed = new Set(currentState.completed);
    if (stepIsCompleteFor(currentState, currentStep)) completed.add(currentStep);
    else completed.delete(currentStep);
    currentState = { ...currentState, completed: [...completed] };
    let resolvedProjectId = projectId ?? selectedProject?.id;
    if (!resolvedProjectId) {
      if (projectsPending || projectsQuery.isPending) return;
      const ensuredProjectId = await ensureProject();
      if (!ensuredProjectId) return;
      resolvedProjectId = ensuredProjectId;
    }
    if (currentStep === 2) {
      const saveProjectId = resolvedProjectId;
      setProductsSaving(true);
      try {
        const saved = await onboardingApi.update(saveProjectId, progressPayload(currentState));
        const authoritative = normalizeOnboardingUrls({ ...currentState, ...saved });
        queryClient.setQueryData(['projects', saveProjectId, 'onboarding'], saved);
        const authoritativeSteps = onboardingStepsOf(authoritative.platforms, authoritative.channels);
        const localNextIncomplete = authoritativeSteps.findIndex((_, index) => !stepIsCompleteFor(authoritative, index + 1)) + 1;
        const backendCurrentStep = typeof saved.currentStep === 'number' && Number.isInteger(saved.currentStep)
          && saved.currentStep >= 1 && saved.currentStep <= authoritativeSteps.length
          ? saved.currentStep
          : null;
        const savedCompleted = Array.isArray(saved.completed) ? new Set(saved.completed) : null;
        const backendReportsComplete = Boolean(savedCompleted && authoritativeSteps.every((_, index) => savedCompleted.has(index + 1)));
        const nextStep = backendReportsComplete ? 0 : backendCurrentStep ?? localNextIncomplete;
        if (!nextStep) {
          setState({ ...authoritative, currentStep: authoritativeSteps.length });
          router.push('/dashboard');
        } else {
          setState({ ...authoritative, currentStep: nextStep });
        }
      } catch (cause) {
        reportSaveError(cause, 'Could not save your product links.');
      } finally {
        setProductsSaving(false);
      }
      return;
    }
    if (currentStep === stepCount) {
      const finished = { ...currentState, currentStep, skipped: false };
      setState(finished);
      router.push('/dashboard');
      return;
    }
    setState({ ...currentState, currentStep: currentStep + 1, skipped: false });
  };
  const previous = () => {
    if (currentStep === 1) return;
    localUserChange.current = true;
    setStepDirection('backward');
    setState({ ...state, currentStep: currentStep - 1, skipped: false });
  };
  const checkForAppLinks = async () => {
    const raw = normalizeOnboardingUrl(state.websiteUrl);
    if (!raw) return;
    const websiteError = onboardingUrlError(state.websiteUrl, 'Website URL');
    if (websiteError) {
      setUrlErrors((previous) => ({ ...previous, websiteUrl: websiteError }));
      setAppLinkScanState('error');
      setAppLinkScanError(websiteError);
      return;
    }
    const scanProjectId = projectId ?? await ensureProject();
    if (!scanProjectId) return;
    setState((previous) => ({ ...previous, websiteUrl: raw }));
    setAppLinkScanState('checking');
    setAppLinkScanError('');
    try {
      // Keep onboarding on its dedicated endpoint. It uses the same backend
      // detector as Business Analysis while preserving the onboarding API
      // contract and its project-scoped route.
      const links = await onboardingApi.appLinks(scanProjectId, raw);
      setDetectedAppLinks(links);
      const filledFields: Partial<OnboardingState> = {};
      if (!state.androidAppUrl.trim() && links.androidAppUrl) filledFields.androidAppUrl = links.androidAppUrl;
      if (!state.iosAppUrl.trim() && links.iosAppUrl) filledFields.iosAppUrl = links.iosAppUrl;
      if (Object.keys(filledFields).length) patch(filledFields);
      setAppLinkScanState(links.androidAppUrl || links.iosAppUrl ? 'found' : 'not-found');
    } catch (cause) {
      setDetectedAppLinks({ androidAppUrl: null, iosAppUrl: null });
      setAppLinkScanError((cause as ApiError).message || 'We couldn’t open that website.');
      setAppLinkScanState('error');
    }
  };
  const verifyWebsiteDomain = async (value: string): Promise<WebsiteCheckState> => {
    const raw = normalizeOnboardingUrl(value);
    const validationError = onboardingUrlError(raw, 'Website URL');
    if (!raw || validationError) return 'unknown';
    setWebsiteCheckState('checking');
    setWebsiteCheckMessage('');
    try {
      const response = await fetch('/api/onboarding/website-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: raw }),
      });
      const result = await response.json() as { status?: WebsiteCheckState; message?: string };
      const status = result.status === 'valid' || result.status === 'not_found' ? result.status : 'unknown';
      setWebsiteCheckState(status);
      setWebsiteCheckMessage(result.message ?? 'We could not verify the domain right now.');
      setVerifiedWebsiteUrl(status === 'valid' ? raw : '');
      return status;
    } catch {
      setWebsiteCheckState('unknown');
      setWebsiteCheckMessage('We could not verify the domain right now.');
      setVerifiedWebsiteUrl('');
      return 'unknown';
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
    setAppLinkScanError('');
    setDetectedAppLinks({ androidAppUrl: null, iosAppUrl: null });
    setUrlErrors((previous) => ({ ...previous, websiteUrl: '' }));
    setWebsiteCheckState('idle');
    setWebsiteCheckMessage('');
    setVerifiedWebsiteUrl('');
    setProductsError('');
    patch({ websiteUrl: value });
  };
  const updateProductUrl = (field: OnboardingUrlField, value: string) => {
    setUrlErrors((previous) => ({ ...previous, [field]: '' }));
    setProductsError('');
    patch({ [field]: value } as Partial<OnboardingState>);
  };
  const applyDetectedAppLink = (field: 'androidAppUrl' | 'iosAppUrl') => {
    const value = detectedAppLinks[field];
    if (!value) return;
    updateProductUrl(field, value);
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
      reportSaveError(cause, 'Could not save your onboarding preference.');
      return;
    }
    router.push('/dashboard/onboarding');
  };
  const togglePlatform = (id: ProjectPlatform) => {
    localUserChange.current = true;
    if (id === 'mobile' && state.platforms.includes('mobile')) {
      setAppLinkScanState('idle');
      setAppLinkScanError('');
      setDetectedAppLinks({ androidAppUrl: null, iosAppUrl: null });
    }
    setState((previous) => {
      const platforms = toggleProjectPlatform(previous.platforms, id);
      if (platforms === previous.platforms) return previous;
      // Drop the push channel of a product type that was just removed.
      const channels = previous.channels.filter((channel) => {
        const platform = channelOptions.find((option) => option.id === channel)?.platform;
        return !platform || platforms.includes(platform);
      });
      return { ...previous, platforms, channels, completed: remapCompletedSteps(previous, platforms, channels), skipped: false };
    });
  };
  const toggleChannel = (id: string) => {
    localUserChange.current = true;
    setState((previous) => {
      const adding = !previous.channels.includes(id);
      return {
        ...previous,
        channels: adding ? [...previous.channels, id] : previous.channels.filter((x) => x !== id),
        completed: remapCompletedSteps(previous, previous.platforms, adding ? [...previous.channels, id] : previous.channels.filter((x) => x !== id)),
        skipped: false,
        ...(id === 'mobile-push' ? { firebaseChecklist: [] } : {}),
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
      reportSaveError(cause, 'Could not create or update the Project.');
      return null;
    }
  };

  // Continue is navigation, not a completion action. Incomplete steps remain
  // incomplete and can be finished later from the onboarding guide.
  const canContinue = true;
  const heading = onboardingHeadingByKind[activeStep.kind];
  const questionEyebrow = `STEP ${String(currentStep).padStart(2, '0')} · ${activeStep.title.toUpperCase()}`;
  const prompt = onboardingPromptByKind[activeStep.kind];

  return (
    <Box className="onboarding-shell">
      <Container maxWidth="lg" className="onboarding-container">
        <Box className="onboarding-progress-area" style={{ '--onboarding-step-count': stepCount } as CSSProperties}>
          <Stack direction="row" justifyContent="space-between" alignItems="end" mb={1.5}>
            <Box />
            <Typography variant="body2" color="text.secondary">{completedCount} of {stepCount} complete</Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            // The wizard position advances when Continue is clicked. The
            // completion count and checkmarks remain based on real setup data.
            value={((currentStep - 1) / (steps.length - 1)) * 100}
            className="onboarding-progress"
          />
          <div className="onboarding-stepper" style={{ gridTemplateColumns: `repeat(${stepCount}, minmax(0, 1fr))` }}>
            {steps.map(({ title }, index) => {
              const number = index + 1;
              const done = completedSteps.includes(number);
              const locked = false;
              return <button key={`${number}-${title}`} className={`onboarding-step${done ? ' is-done' : ''}${currentStep === number ? ' is-current' : ''}`} onClick={() => !locked && goToStep(number)} disabled={locked}>
                <span className="onboarding-step-number">{done ? <CheckRounded fontSize="small" /> : number}</span><span>{title}</span>
              </button>;
            })}
          </div>
        </Box>

        <div className="onboarding-workspace">
          <Paper elevation={0} className="onboarding-chat">
            <div className="onboarding-chat-head"><span className="max-avatar"><Image src="/assets/agent-avatar-max-v4.webp" alt="Max" width={52} height={52} /></span><span><strong>Max</strong><small>PIXLPUSH ONBOARDING GUIDE</small></span><Typography className="onboarding-chat-step-label">{questionEyebrow}</Typography></div>
              <div key={currentStep} className={`onboarding-chat-body onboarding-step-panel ${stepDirection}`}>
              {!isSdkStep && prompt && <div className="max-message"><AutoAwesomeRounded fontSize="small" /><p>{prompt}</p></div>}
              <div className="onboarding-question"><Typography variant="h4" className="onboarding-question-title">{heading}</Typography>
                {currentStep <= 3 && <OnboardingCommonStep
                  kind={activeStep.kind as 'basics' | 'products' | 'channels'}
                  projectName={state.projectName}
                  platforms={state.platforms}
                  websiteUrl={state.websiteUrl}
                  androidAppUrl={state.androidAppUrl}
                  iosAppUrl={state.iosAppUrl}
                  channels={state.channels}
                  senderEmail={state.senderEmail}
                  urlErrors={urlErrors}
                  websiteCheckState={websiteCheckState}
                  websiteCheckMessage={websiteCheckMessage}
                  productsError={productsError}
                  linkCheckState={appLinkScanState}
                  linkCheckError={appLinkScanError}
                  detectedLinks={detectedAppLinks}
                  domainVerificationBusy={domainVerificationBusy}
                  domainVerificationError={domainVerificationError}
                  onProjectNameChange={(projectName) => patch({ projectName })}
                  onPlatformToggle={togglePlatform}
                  onChannelToggle={toggleChannel}
                  onUrlChange={(field, value) => field === 'websiteUrl' ? updateWebsiteUrl(value) : updateProductUrl(field, value)}
                  onUrlBlur={(field) => {
                    const error = onboardingUrlError(state[field], field === 'websiteUrl' ? 'Website URL' : field === 'androidAppUrl' ? 'Android app link' : 'iOS app link');
                    setUrlErrors((previous) => ({ ...previous, [field]: error || '' }));
                    if (!error) patch({ [field]: normalizeOnboardingUrl(state[field]) } as Partial<OnboardingState>);
                    if (field === 'websiteUrl' && !error && state.websiteUrl.trim()) void verifyWebsiteDomain(state.websiteUrl);
                  }}
                  onCheckLinks={() => void checkForAppLinks()}
                  onApplyDetectedLink={applyDetectedAppLink}
                  onSenderEmailChange={(senderEmail) => patch({ senderEmail, domain: domainFromEmail(senderEmail) ?? '' })}
                  onVerifyDomain={() => void openDomainVerification()}
                />}
                {activeStep.kind === 'domain' && <OnboardingCommonStep
                  kind="domain"
                  senderEmail={state.senderEmail}
                  domainVerificationBusy={domainVerificationBusy}
                  domainVerificationError={domainVerificationError}
                  onSenderEmailChange={(senderEmail) => { patch({ senderEmail, domain: domainFromEmail(senderEmail) ?? '' }); setDomainVerificationError(''); }}
                  onVerifyDomain={() => void openDomainVerification()}
                />}
                {activeStep.kind === 'mobile-push' && hasMobile && <OnboardingStepExperience kind="mobile-push" firebaseConnected={firebaseConnected} apnsConnected={apnsConnected} onFirebase={openFirebaseWithMax} onApns={() => setApnsDialogOpen(true)} />}
                {isSdkStep && <OnboardingStepExperience
                  kind={activeStep.kind as 'app-sdk' | 'web-sdk'}
                  projectName={state.projectName}
                  projectId={projectId}
                  projectSlug={selectedProject?.slug}
                  canCreateSdkKey={Boolean(selectedProject && ['owner', 'admin', 'developer'].includes(selectedProject.role))}
                  onRequestSdk={() => setSdkRequestOpen(true)}
                  onSendDeveloperInstructions={async (input) => {
                    if (!projectId) throw new Error('Select a project before sending developer instructions.');
                    return onboardingApi.sendSdkInstructions(projectId, input);
                  }}
                />}
              </div>
            </div>
            <div className="onboarding-chat-footer">{saveError && !/Website URL must point to a public website/i.test(saveError) && <Alert severity="error" sx={{ mb: 1.5 }}>{saveError}</Alert>}<Typography variant="caption">Your progress is saved to this project. You can return from the Onboarding Guide on any device.</Typography><div className="onboarding-footer-actions">{currentStep > 1 && <Button variant="contained" className="onboarding-back-button" onClick={previous} startIcon={<ArrowBackRounded />} disabled={productsSaving}>Back</Button>}<Button variant="contained" disabled={!canContinue || productsSaving} onClick={() => void next()} endIcon={<ArrowForwardRounded />}>{productsSaving ? 'Saving…' : currentStep === stepCount ? 'Finish setup' : 'Continue'}</Button></div></div>
          </Paper>
          <aside className="onboarding-side-note"><div className="onboarding-orbit"><span><Image className="onboarding-orbit-logo" src="/assets/favicon.webp" alt="PixlPush" width={52} height={52} /></span><i/><b/></div><Typography variant="h6">A little setup now.<br/>A clearer picture later.</Typography><Typography color="text.secondary">Max will keep your place so you can pause and pick up whenever you’re ready.</Typography><Button onClick={() => void skip()} variant="outlined" className="onboarding-side-skip">Skip setup <ArrowForwardRounded fontSize="small" /></Button></aside>
        </div>
        <FirebaseConnectDialog open={firebaseDialogOpen} onClose={() => setFirebaseDialogOpen(false)} projectId={projectId} existing={firebaseQuery.data} onConnected={() => {
          void queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'firebase'] });
          markMobilePushDone();
        }} />
        <SdkRequestDialog open={sdkRequestOpen} onClose={() => setSdkRequestOpen(false)} projectId={projectId} />
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
