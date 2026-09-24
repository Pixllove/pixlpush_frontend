import DashboardFrame from '@/components/dashboard/DashboardFrame';
import AudienceGroupWorkspace from '@/components/dashboard/AudienceGroupWorkspace';

export default async function AudienceGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DashboardFrame active="Users" title="" description="" hideHeader><AudienceGroupWorkspace groupId={id} /></DashboardFrame>;
}
