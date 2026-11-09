import DashboardFrame from '@/components/dashboard/DashboardFrame';
import ProjectSettingsCenter from '@/components/dashboard/ProjectSettingsCenter';

export const metadata = { title: 'HubSpot Settings — PixlPush' };

export default function HubspotSettingsPage() {
  return <DashboardFrame requiresProject active="Project Settings" title="Project settings" description="Manage the active Project without changing other Projects in your Account."><ProjectSettingsCenter initialTab="HubSpot" /></DashboardFrame>;
}
