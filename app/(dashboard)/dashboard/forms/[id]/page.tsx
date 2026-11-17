import DashboardFrame from '@/components/dashboard/DashboardFrame';
import FormOverview from '@/components/dashboard/forms/FormOverview';

export const metadata = { title: 'Form — PixlPush' };

export default function FormOverviewPage({ params }: { params: { id: string } }) {
  return (
    <DashboardFrame requiresProject active="Forms" title="" description="" hideHeader>
      <FormOverview id={params.id} />
    </DashboardFrame>
  );
}
