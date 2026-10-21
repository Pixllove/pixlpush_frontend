import DashboardFrame from '@/components/dashboard/DashboardFrame';
import JourneyCreateWorkspace from '@/components/dashboard/JourneyCreateWorkspace';

export const metadata = { title: 'Create Journey — PixlPush' };

export default function JourneyCreatePage() {
  return <DashboardFrame requiresProject active="Journey Automations" title="Journey Automations" description="Build behavior-aware journeys that keep users moving forward."><JourneyCreateWorkspace /></DashboardFrame>;
}
