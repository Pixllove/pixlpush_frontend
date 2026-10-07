import { Suspense } from 'react';
import AuthShell from '@/components/website/AuthShell';
import ResetPasswordView from '@/components/auth/ResetPasswordView';

export default function ResetPasswordPage() {
  return (
    <AuthShell mode="security">
      <Suspense>
        <ResetPasswordView />
      </Suspense>
    </AuthShell>
  );
}
