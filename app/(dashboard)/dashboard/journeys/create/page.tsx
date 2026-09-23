import DashboardFrame from '@/components/dashboard/DashboardFrame';
import JourneyCreateWorkspace from '@/components/dashboard/JourneyCreateWorkspace';

export default function JourneyCreatePage() {
  return <DashboardFrame active="Journey Automations" title="Journey Automations" description="Build behavior-aware journeys that keep users moving forward."><JourneyCreateWorkspace /></DashboardFrame>;
}
