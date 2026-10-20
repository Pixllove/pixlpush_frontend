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

export const ONBOARDING_KEY = 'pixlpush:onboarding:v1';
export const initialOnboardingState: OnboardingState = {
  projectName: '', websiteUrl: '', androidAppUrl: '', iosAppUrl: '', channels: [], domain: '', firebaseChecklist: [], currentStep: 1, completed: [], skipped: false,
};

export function readOnboardingState(): OnboardingState {
  if (typeof window === 'undefined') return initialOnboardingState;
  try {
    const value = localStorage.getItem(ONBOARDING_KEY);
    if (!value) return initialOnboardingState;
    const parsed = JSON.parse(value);
    return { ...initialOnboardingState, ...parsed, websiteUrl: parsed.websiteUrl ?? parsed.productUrl ?? '' };
  } catch { return initialOnboardingState; }
}

export function saveOnboardingState(state: OnboardingState) {
  try { localStorage.setItem(ONBOARDING_KEY, JSON.stringify(state)); } catch { /* storage may be disabled */ }
}

export function onboardingNeedsResume(state = readOnboardingState()) {
  const pushEnabled = state.channels.includes('push');
  return !Array.from({ length: 6 }, (_, index) => index + 1)
    .every((step) => state.completed.includes(step) || (step === 5 && !pushEnabled));
}
