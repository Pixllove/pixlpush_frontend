import DashboardFrame from '@/components/dashboard/DashboardFrame';
import EmailWorkspace from '@/components/dashboard/EmailWorkspace';

export default function EmailPage() {
  return <DashboardFrame active="Email" title="Email Template" description="Create, manage, and reuse email templates for future campaigns and Journey Automations."><EmailWorkspace /></DashboardFrame>;
}
