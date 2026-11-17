import { Suspense } from 'react';
import DashboardFrame from '@/components/dashboard/DashboardFrame';
import { EditorSkeleton } from '@/components/dashboard/forms/FormEditor';
import { FormWizard } from '@/components/dashboard/forms/FormWizard';
import { isEditorStep } from '@/components/dashboard/forms/model';

export const metadata = { title: 'Edit form — PixlPush' };

export default function EditFormPage({ params, searchParams }: { params: { id: string }; searchParams: { step?: string } }) {
  // The editor covers the whole screen. Rendering it without the dashboard frame means a reload
  // paints the editor (or its skeleton) straight away instead of flashing the dashboard first.
  if (isEditorStep(searchParams.step)) return <Suspense fallback={<EditorSkeleton />}><FormWizard id={params.id} /></Suspense>;
  return (
    <DashboardFrame requiresProject active="Forms" title="" description="" hideHeader>
      <Suspense fallback={null}><FormWizard id={params.id} /></Suspense>
    </DashboardFrame>
  );
}
