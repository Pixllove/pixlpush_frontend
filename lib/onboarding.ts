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

const ONBOARDING_STEP_COUNT = 6;

/** Same rule as the backend: mobile needs a connected Firebase, web needs no setup. */
export const isPushReady = (platforms: ProjectPlatform[] | undefined, firebaseStatus: string | undefined) =>
  !(platforms ?? ['mobile']).includes('mobile') || firebaseStatus === 'connected';

/** The backend's answer, falling back to the old rule for an older API. */
export const pushReadyOf = (firebase: FirebaseSettings | undefined) =>
  firebase?.pushReady ?? firebase?.status === 'connected';

/** Counts resolved setup steps. Step 5 (push) depends on the Project's platforms. */
export function onboardingCompletedCount(
  state: Pick<OnboardingState, 'channels' | 'completed'>,
  firebaseConnected = false,
): number {
  // A progress record belongs to an existing Project, so Project basics is
  // complete even for legacy records that predate this invariant.
  const completed = new Set([1, ...state.completed]);
  return Array.from({ length: ONBOARDING_STEP_COUNT }, (_, index) => index + 1)
    .filter((step) => step === 5 ? firebaseConnected : completed.has(step))
    .length;
}

export function onboardingPercentage(
  state: Pick<OnboardingState, 'channels' | 'completed'>,
  firebaseConnected = false,
): number {
  return Math.round((onboardingCompletedCount(state, firebaseConnected) / ONBOARDING_STEP_COUNT) * 100);
}
