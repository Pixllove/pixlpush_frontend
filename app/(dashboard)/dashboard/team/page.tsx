import DashboardFrame from '@/components/dashboard/DashboardFrame';
import { TeamSection } from '@/components/dashboard/DashboardSections';
export default function TeamPage() { return <DashboardFrame requiresProject active="Team & Access" title="Team & Access" description="Invite teammates and manage Project-scoped roles and permissions."><TeamSection /></DashboardFrame>; }
