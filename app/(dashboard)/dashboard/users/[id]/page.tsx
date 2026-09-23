import DashboardFrame from '@/components/dashboard/DashboardFrame';
import UserDetailsWorkspace from '@/components/dashboard/UserDetailsWorkspace';

export default async function UserDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DashboardFrame active="Users" title="" description="" hideHeader><UserDetailsWorkspace userId={id} /></DashboardFrame>;
}
