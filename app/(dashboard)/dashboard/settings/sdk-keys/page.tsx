import DashboardFrame from '@/components/dashboard/DashboardFrame';
import ProjectSettingsCenter from '@/components/dashboard/ProjectSettingsCenter';

export const metadata = { title: 'SDK Keys Settings — PixlPush' };

export default function SdkKeysSettingsPage() {
  return <DashboardFrame requiresProject active="Project Settings" title="Project settings" description="Manage the active Project without changing other Projects in your Account."><ProjectSettingsCenter initialTab="SDK keys" /></DashboardFrame>;
}
