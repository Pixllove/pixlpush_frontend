import { Suspense } from 'react';
import DashboardFrame from '@/components/dashboard/DashboardFrame';
import { FormCreate } from '@/components/dashboard/forms/FormWizard';

export const metadata = { title: 'Create form — PixlPush' };

export default function CreateFormPage() {
  return (
    <DashboardFrame requiresProject active="Forms" title="" description="" hideHeader>
      <Suspense fallback={null}><FormCreate /></Suspense>
    </DashboardFrame>
  );
}
