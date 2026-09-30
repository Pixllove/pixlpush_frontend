import { Suspense } from 'react';
import AuthShell from '@/components/website/AuthShell';
import InvitationAccept from '@/components/auth/InvitationAccept';

export default function AcceptInvitationPage() {
  return (
    <AuthShell mode="invite">
      {/* GoogleButton reads search params, which needs a Suspense boundary. */}
      <Suspense>
        <InvitationAccept />
      </Suspense>
    </AuthShell>
  );
}
