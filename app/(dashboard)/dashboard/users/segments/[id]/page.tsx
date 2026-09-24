import DashboardFrame from '@/components/dashboard/DashboardFrame';
import LifecycleSegmentWorkspace from '@/components/dashboard/LifecycleSegmentWorkspace';

export default async function LifecycleSegmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DashboardFrame active="Users" title="" description="" hideHeader><LifecycleSegmentWorkspace segmentId={id} /></DashboardFrame>;
}
