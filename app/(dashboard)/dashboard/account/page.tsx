import DashboardFrame from '@/components/dashboard/DashboardFrame';
import AccountProfile from '@/components/auth/AccountProfile';

export default function AccountProfilePage() {
  return (
    <DashboardFrame
      active="Settings"
      title="My profile"
      description="Manage your PixlPush account details and security."
    >
      <AccountProfile />
    </DashboardFrame>
  );
}
