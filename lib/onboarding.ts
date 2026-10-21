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
