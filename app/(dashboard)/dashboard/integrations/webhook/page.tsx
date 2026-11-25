import DashboardFrame from '@/components/dashboard/DashboardFrame';
import WebhookIntegration from '@/components/integrations/WebhookIntegration';

export const metadata = { title: 'Webhook — PixlPush' };

export default function WebhookIntegrationPage() {
  return (
    <DashboardFrame requiresProject active="Integrations" title="Webhook" description="Connect your server to the active Project.">
      <WebhookIntegration />
    </DashboardFrame>
  );
}
