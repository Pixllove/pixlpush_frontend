import DashboardFrame from '@/components/dashboard/DashboardFrame';
import IntegrationsHub from '@/components/integrations/IntegrationsHub';

export const metadata = { title: 'Integrations — PixlPush' };

export default function IntegrationsPage() {
  return (
    <DashboardFrame requiresProject active="Integrations" title="Integrations" description="Connect the tools you already use. Each integration is set up per Project.">
      <IntegrationsHub />
    </DashboardFrame>
  );
}
