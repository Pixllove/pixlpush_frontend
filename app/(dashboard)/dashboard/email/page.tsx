import DashboardFrame from '@/components/dashboard/DashboardFrame';
import { ChannelSection } from '@/components/dashboard/DashboardSections';
export default function EmailPage() { return <DashboardFrame active="Email" title="Email" description="Create, send and measure email campaigns for your Project."><ChannelSection channel="email" /></DashboardFrame>; }
