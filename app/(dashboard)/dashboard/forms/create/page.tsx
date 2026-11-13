import DashboardFrame from '@/components/dashboard/DashboardFrame';
import FormCreateWorkspace from '@/components/dashboard/FormCreateWorkspace';

export const metadata = { title: 'Create form — PixlPush' };

export default function CreateFormPage() {
  return (
    <DashboardFrame requiresProject active="Forms" title="" description="" hideHeader>
      <FormCreateWorkspace />
    </DashboardFrame>
  );
}
