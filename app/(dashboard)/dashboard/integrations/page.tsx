import DashboardFrame from '@/components/dashboard/DashboardFrame';
import ProjectSettingsCenter from '@/components/dashboard/ProjectSettingsCenter';
export default function IntegrationsPage() { return <DashboardFrame active="Integrations" title="Integrations" description="Connect Firebase, email sending and your PixlPush SDK safely."><ProjectSettingsCenter initialTab="Firebase / FCM" /></DashboardFrame>; }
