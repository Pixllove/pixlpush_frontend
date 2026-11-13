import DashboardFrame from '@/components/dashboard/DashboardFrame';
import FormsWorkspace from '@/components/dashboard/FormsWorkspace';

export const metadata = { title: 'Forms — PixlPush' };

export default function FormsPage() {
  return (
    <DashboardFrame
      requiresProject
      active="Forms"
      title="Forms"
      description="Create signup experiences that turn visitors into engaged subscribers."
      action={null}
    >
      <FormsWorkspace />
    </DashboardFrame>
  );
}
