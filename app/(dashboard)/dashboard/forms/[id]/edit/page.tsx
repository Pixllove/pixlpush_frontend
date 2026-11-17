import { Suspense } from 'react';
import DashboardFrame from '@/components/dashboard/DashboardFrame';
import { FormWizard } from '@/components/dashboard/forms/FormWizard';

export const metadata = { title: 'Edit form — PixlPush' };

export default function EditFormPage({ params }: { params: { id: string } }) {
  return (
    <DashboardFrame requiresProject active="Forms" title="" description="" hideHeader>
      <Suspense fallback={null}><FormWizard id={params.id} /></Suspense>
    </DashboardFrame>
  );
}
