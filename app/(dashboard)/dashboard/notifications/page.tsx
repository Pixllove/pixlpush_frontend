import DashboardFrame from '@/components/dashboard/DashboardFrame';
import NotificationInbox from '@/components/dashboard/NotificationInbox';

export const metadata = { title: 'Notifications — PixlPush' };

export default function NotificationsPage() {
  return (
    <DashboardFrame
      active="Notifications"
      title="Notifications"
      description="Stay on top of account, project, team and security updates."
    >
      <NotificationInbox />
    </DashboardFrame>
  );
}
