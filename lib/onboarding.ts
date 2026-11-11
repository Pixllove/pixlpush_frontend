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
  currentStep: number;
  completed: number[];
  skipped: boolean;
};

export const initialOnboardingState: OnboardingState = {
  projectName: '', platforms: ['mobile'], websiteUrl: '', androidAppUrl: '', iosAppUrl: '', channels: [], senderEmail: '', domain: '', firebaseChecklist: [], currentStep: 1, completed: [], skipped: false,
};

export type SdkSurface = 'mobile' | 'web';

/** Same rule as the backend: one SDK step per product type, App SDK (step 6) before Web SDK. */
export const sdkSurfacesOf = (platforms: ProjectPlatform[] | undefined): SdkSurface[] =>
  (['mobile', 'web'] as const).filter((surface) => (platforms?.length ? platforms : ['mobile']).includes(surface));

/** 6 steps for one product type, 7 when both Website and Mobile App are chosen. */
export const onboardingStepCount = (platforms: ProjectPlatform[] | undefined) => 5 + sdkSurfacesOf(platforms).length;

export const SDK_STEP_TITLES: Record<SdkSurface, string> = { mobile: 'App SDK', web: 'Web SDK' };

/** Same rule as the backend: mobile needs a connected Firebase, web needs no setup. */
export const isPushReady = (platforms: ProjectPlatform[] | undefined, firebaseStatus: string | undefined) =>
  !(platforms ?? ['mobile']).includes('mobile') || firebaseStatus === 'connected';

/** The backend's answer, falling back to the old rule for an older API. */
export const pushReadyOf = (firebase: FirebaseSettings | undefined) =>
  firebase?.pushReady ?? firebase?.status === 'connected';

/** Counts resolved setup steps. Step 5 (push) depends on the Project's platforms. */
export function onboardingCompletedCount(
  state: Pick<OnboardingState, 'channels' | 'completed' | 'platforms'>,
  firebaseConnected = false,
): number {
  const completed = new Set(state.completed);
  // Compatibility for older API responses that did not include the derived
  // push step. New responses already contain the authoritative list.
  if (firebaseConnected) completed.add(5);
  return Array.from({ length: onboardingStepCount(state.platforms) }, (_, index) => index + 1)
    .filter((step) => completed.has(step))
    .length;
}

export function onboardingPercentage(
  state: Pick<OnboardingState, 'channels' | 'completed' | 'platforms'>,
  firebaseConnected = false,
): number {
  return Math.round((onboardingCompletedCount(state, firebaseConnected) / onboardingStepCount(state.platforms)) * 100);
}
