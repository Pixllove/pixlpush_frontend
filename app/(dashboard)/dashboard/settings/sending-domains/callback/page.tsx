import DashboardFrame from '@/components/dashboard/DashboardFrame';
import ProjectSettingsCenter from '@/components/dashboard/ProjectSettingsCenter';

export const metadata = { title: 'Sending Domain Settings — PixlPush' };

/** Provider redirect target: the panel finishes the connection and cleans the URL. */
export default function SendingDomainCallbackPage() {
  return (
      <DashboardFrame requiresProject active="Project Settings" title="Project settings" description="Manage the active Project without changing other Projects in your Account.">
      <ProjectSettingsCenter initialTab="Domain" />
    </DashboardFrame>
  );
}
