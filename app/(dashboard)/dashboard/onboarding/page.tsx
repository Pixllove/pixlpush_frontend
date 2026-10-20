import DashboardFrame from '@/components/dashboard/DashboardFrame';
import OnboardingGuide from '@/components/onboarding/OnboardingGuide';

export const metadata = { title: 'Onboarding Guide — PixlPush', description: 'Track your PixlPush project setup and continue onboarding with Max.' };
export default function OnboardingGuidePage() {
  return <DashboardFrame active="Onboarding Guide" title="Onboarding Guide" description="Track your setup and pick up with Max whenever you’re ready."><OnboardingGuide /></DashboardFrame>;
}
