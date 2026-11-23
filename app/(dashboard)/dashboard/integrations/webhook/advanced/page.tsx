import DashboardFrame from '@/components/dashboard/DashboardFrame';
import WebhookAdvanced from '@/components/integrations/WebhookAdvanced';

export const metadata = { title: 'Webhook Advanced Tools — PixlPush' };

export default function WebhookAdvancedPage() {
  return (
    <DashboardFrame requiresProject active="Integrations" title="Advanced webhook tools" description="History imports, journey migration, and custom mappings.">
      <WebhookAdvanced />
    </DashboardFrame>
  );
}
