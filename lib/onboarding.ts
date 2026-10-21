export type OnboardingState = {
  projectName: string;
  websiteUrl: string;
  androidAppUrl: string;
  iosAppUrl: string;
  channels: string[];
  domain: string;
  firebaseChecklist: number[];
  currentStep: number;
  completed: number[];
  skipped: boolean;
};

export const initialOnboardingState: OnboardingState = {
  projectName: '', websiteUrl: '', androidAppUrl: '', iosAppUrl: '', channels: [], domain: '', firebaseChecklist: [], currentStep: 1, completed: [], skipped: false,
};

const ONBOARDING_STEP_COUNT = 6;

/** Counts resolved setup steps. Firebase is required for every Project. */
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
