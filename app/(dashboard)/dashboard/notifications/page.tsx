import DashboardFrame from '@/components/dashboard/DashboardFrame';
import NotificationWorkspace from '@/components/dashboard/NotificationWorkspace';

export const metadata = { title: 'Notifications — PixlPush' };

export default function NotificationsPage() {
  return (
    <DashboardFrame
      active="Notifications"
      title="Notifications"
      description="Stay on top of account, project, team and security updates."
    >
      <NotificationWorkspace />
    </DashboardFrame>
  );
}
