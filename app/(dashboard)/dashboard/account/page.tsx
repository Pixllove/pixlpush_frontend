import DashboardFrame from '@/components/dashboard/DashboardFrame';
import ChangePasswordForm from '@/components/auth/ChangePasswordForm';

export default function AccountSecurityPage() {
  return (
    <DashboardFrame
      active="Settings"
      title="Account security"
      description="These settings apply to your PixlPush Account, not to a single Project."
    >
      <ChangePasswordForm />
    </DashboardFrame>
  );
}
