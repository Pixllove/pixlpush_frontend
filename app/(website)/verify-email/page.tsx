import { Suspense } from 'react';
import AuthShell from '@/components/website/AuthShell';
import VerifyEmailView from '@/components/auth/VerifyEmailView';

export default function VerifyEmailPage() {
  return (
    <AuthShell mode="signup">
      <Suspense>
        <VerifyEmailView />
      </Suspense>
    </AuthShell>
  );
}
