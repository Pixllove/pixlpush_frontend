import DashboardFrame from '@/components/dashboard/DashboardFrame';
import { OverviewSection } from '@/components/dashboard/DashboardSections';

export const metadata = { title: 'Dashboard — PixlPush', description: 'Manage audiences, campaigns and retention analytics in PixlPush.' };

export default function DashboardPage() { return <DashboardFrame requiresProject active="Home" title="Home" description="Your AI growth team, ready to turn insight into action." hideHeader><OverviewSection /></DashboardFrame>; }
