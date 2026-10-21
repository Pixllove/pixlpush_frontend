import DashboardFrame from '@/components/dashboard/DashboardFrame';
import LifecycleSegmentWorkspace from '@/components/dashboard/LifecycleSegmentWorkspace';

export const metadata = { title: 'Lifecycle Segment — PixlPush' };

export default async function LifecycleSegmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DashboardFrame requiresProject active="Users" title="" description="" hideHeader><LifecycleSegmentWorkspace segmentId={id} /></DashboardFrame>;
}
