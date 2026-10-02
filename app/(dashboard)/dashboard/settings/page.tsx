import DashboardFrame from '@/components/dashboard/DashboardFrame';
import ProjectSettingsCenter from '@/components/dashboard/ProjectSettingsCenter';
export default function SettingsPage() { return <DashboardFrame requiresProject active="Settings" title="Project settings" description="Manage the active Project without changing other Projects in your Account."><ProjectSettingsCenter /></DashboardFrame>; }
