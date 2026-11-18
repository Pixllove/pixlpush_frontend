import type { FirebaseSettings, ProjectPlatform } from '@/types/project';

export type OnboardingState = {
  projectName: string;
  platforms: ProjectPlatform[];
  websiteUrl: string;
  androidAppUrl: string;
  iosAppUrl: string;
  channels: string[];
  senderEmail: string;
  domain: string;
  firebaseChecklist: number[];
  deferredSteps: OnboardingStepKind[];
  currentStep: number;
  completed: number[];
  skipped: boolean;
};

export const initialOnboardingState: OnboardingState = {
  projectName: '', platforms: ['mobile'], websiteUrl: '', androidAppUrl: '', iosAppUrl: '', channels: [], senderEmail: '', domain: '', firebaseChecklist: [], deferredSteps: [], currentStep: 1, completed: [], skipped: false,
};

export type SdkSurface = 'mobile' | 'web';

export type OnboardingStepKind =
  | 'basics'
  | 'products'
  | 'channels'
  | 'domain'
  | 'mobile-push'
  | 'app-sdk'
  | 'web-sdk';

export type OnboardingStep = {
  kind: OnboardingStepKind;
  title: string;
};

export type OnboardingUrlField = 'websiteUrl' | 'androidAppUrl' | 'iosAppUrl';

/**
 * Accept the URL forms people commonly paste into onboarding. The backend
 * expects an absolute HTTP(S) URL, so bare domains are given an https scheme.
 * Markdown links are reduced to their destination before normalization.
 */
export function normalizeOnboardingUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const markdown = trimmed.match(/^\s*\[[^\]]*\]\(([^)\s]+)\)\s*$/);
  const candidate = (markdown?.[1] ?? trimmed).trim();
  return /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
}

export function onboardingUrlError(value: string, label = 'URL'): string | null {
  if (!value.trim()) return null;
  const normalized = normalizeOnboardingUrl(value);
  try {
    const parsed = new URL(normalized);
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) throw new Error();
    return null;
  } catch {
    return `${label} must be a valid website or app-store link, for example https://example.com.`;
  }
}

export function normalizeOnboardingUrls<T extends Pick<OnboardingState, OnboardingUrlField>>(value: T): T {
  return {
    ...value,
    websiteUrl: normalizeOnboardingUrl(value.websiteUrl),
    androidAppUrl: normalizeOnboardingUrl(value.androidAppUrl),
    iosAppUrl: normalizeOnboardingUrl(value.iosAppUrl),
  };
}

/** Legacy helper for callers that need the selected product surfaces. */
export const sdkSurfacesOf = (platforms: ProjectPlatform[] | undefined): SdkSurface[] =>
  (['mobile', 'web'] as const).filter((surface) => (platforms?.length ? platforms : ['mobile']).includes(surface));

const selectedPlatformsOf = (platforms: ProjectPlatform[] | undefined) =>
  platforms?.length ? platforms : ['mobile' as const];

const hasChannel = (channels: string[] | undefined, value: string, legacyPush = false) =>
  Boolean(channels?.includes(value) || (legacyPush && channels?.includes('push')));

/**
 * The first three steps are always shown. The remaining steps are added only
 * for the selected capabilities, in the exact order used by the backend:
 * domain, mobile push setup, App SDK, then Web SDK.
 */
export const onboardingStepsOf = (
  platforms: ProjectPlatform[] | undefined,
  channels: string[] | undefined,
): OnboardingStep[] => {
  const selectedPlatforms = selectedPlatformsOf(platforms);
  const steps: OnboardingStep[] = [
    { kind: 'basics', title: 'Project basics' },
    { kind: 'products', title: 'Your products' },
    { kind: 'channels', title: 'Channels' },
  ];
  const wantsEmail = hasChannel(channels, 'email');
  const wantsMobilePush = selectedPlatforms.includes('mobile') && hasChannel(channels, 'mobile-push', true);
  const wantsWebPush = selectedPlatforms.includes('web') && hasChannel(channels, 'web-push', true);

  if (wantsEmail) steps.push({ kind: 'domain', title: 'Domain' });
  if (wantsMobilePush) {
    steps.push({ kind: 'mobile-push', title: 'Mobile push setup' });
    steps.push({ kind: 'app-sdk', title: 'App SDK' });
  }
  if (wantsWebPush) steps.push({ kind: 'web-sdk', title: 'Web SDK' });
  return steps;
};

export const onboardingStepCount = (
  platforms: ProjectPlatform[] | undefined,
  channels: string[] | undefined = [],
) => onboardingStepsOf(platforms, channels).length;

export const SDK_STEP_TITLES: Record<SdkSurface, string> = { mobile: 'App SDK', web: 'Web SDK' };

/**
 * Same rule as the backend: mobile needs a connected Firebase or a connected
 * APNs key (iOS apps without Firebase); web needs no setup.
 */
export const isPushReady = (platforms: ProjectPlatform[] | undefined, firebaseStatus: string | undefined, apnsStatus?: string) =>
  !(platforms ?? ['mobile']).includes('mobile') || firebaseStatus === 'connected' || apnsStatus === 'connected';

/** The backend's answer, falling back to the same rule for an older API. */
export const pushReadyOf = (firebase: FirebaseSettings | undefined) =>
  firebase?.pushReady ?? (firebase?.status === 'connected' || firebase?.apns?.status === 'connected');

/** Counts resolved setup steps using the current channel-derived step list. */
export function onboardingCompletedCount(
  state: Pick<OnboardingState, 'channels' | 'completed' | 'platforms'>,
  firebaseConnected = false,
): number {
  const completed = new Set(state.completed);
  const steps = onboardingStepsOf(state.platforms, state.channels);
  // Compatibility for older API responses that did not include the derived
  // mobile push step. New responses already contain the authoritative list.
  if (firebaseConnected) {
    const mobilePushStep = steps.findIndex((step) => step.kind === 'mobile-push');
    if (mobilePushStep >= 0) completed.add(mobilePushStep + 1);
  }
  return steps
    .map((_, index) => index + 1)
    .filter((step) => completed.has(step))
    .length;
}

export function onboardingPercentage(
  state: Pick<OnboardingState, 'channels' | 'completed' | 'platforms'>,
  firebaseConnected = false,
): number {
  const stepCount = onboardingStepCount(state.platforms, state.channels);
  return Math.round((onboardingCompletedCount(state, firebaseConnected) / stepCount) * 100);
}
