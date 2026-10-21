import DashboardFrame from '@/components/dashboard/DashboardFrame';
import AccountProfile from '@/components/auth/AccountProfile';

export const metadata = { title: 'My profile — PixlPush' };

export default function AccountProfilePage() {
  return (
    <DashboardFrame
      active="Profile"
      title="My profile"
      description="Manage your PixlPush account details and security."
    >
      <AccountProfile section="profile" />
    </DashboardFrame>
  );
}
