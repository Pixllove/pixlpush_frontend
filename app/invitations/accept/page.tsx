import AuthShell from '@/components/website/AuthShell';
import InvitationAccept from '@/components/auth/InvitationAccept';

export default function AcceptInvitationPage() {
  return (
    <AuthShell mode="invite">
      <InvitationAccept />
    </AuthShell>
  );
}
