import DashboardFrame from '@/components/dashboard/DashboardFrame';
import AnalyticsWidgetsSection from '@/components/dashboard/AnalyticsWidgetsSection';

export const metadata = { title: 'Analytics — PixlPush', description: 'Understand lifecycle, campaign and retention performance with Ben.' };

export default function AnalyticsPage() {
  return <DashboardFrame requiresProject active="Analytics" title="Analytics" description="Understand what is happening across your users, campaigns and retention motion."><AnalyticsWidgetsSection /></DashboardFrame>;
}
