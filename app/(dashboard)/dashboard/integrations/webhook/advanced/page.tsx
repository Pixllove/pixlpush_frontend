import DashboardFrame from '@/components/dashboard/DashboardFrame';
import WebhookAdvanced from '@/components/integrations/WebhookAdvanced';

export const metadata = { title: 'Server Sync Tools — PixlPush' };

export default function WebhookAdvancedPage() {
  return (
    <DashboardFrame requiresProject active="Integrations" title="Advanced Server Sync tools" description="History imports, journey migration, and custom mappings.">
      <WebhookAdvanced />
    </DashboardFrame>
  );
}
