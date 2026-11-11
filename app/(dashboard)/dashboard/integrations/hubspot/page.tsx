import DashboardFrame from '@/components/dashboard/DashboardFrame';
import HubspotPanel from '@/components/dashboard/HubspotPanel';

export const metadata = { title: 'HubSpot Integration — PixlPush' };

export default function HubspotIntegrationPage() {
  return (
    <DashboardFrame requiresProject active="Integrations" title="HubSpot" description="Two-way contact sync between HubSpot and this Project.">
      <HubspotPanel />
    </DashboardFrame>
  );
}
