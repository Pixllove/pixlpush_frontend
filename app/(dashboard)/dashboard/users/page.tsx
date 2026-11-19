import DashboardFrame from '@/components/dashboard/DashboardFrame';
import { UsersPageDescription, UsersSection } from '@/components/dashboard/DashboardSections';

export const metadata = { title: 'Users — PixlPush' };
export default function UsersPage() { return <DashboardFrame requiresProject active="Users" title="Users" description={<UsersPageDescription />}><UsersSection /></DashboardFrame>; }
