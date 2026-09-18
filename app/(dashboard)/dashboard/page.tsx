import DashboardFrame from '@/components/dashboard/DashboardFrame';
import { OverviewSection } from '@/components/dashboard/DashboardSections';

export const metadata = { title: 'Dashboard — PixlPush', description: 'Manage audiences, campaigns and retention analytics in PixlPush.' };

export default function DashboardPage() { return <DashboardFrame active="Overview" title="Project overview" description="A clear view of PixlTrace performance, reachability and activity."><OverviewSection /></DashboardFrame>; }
