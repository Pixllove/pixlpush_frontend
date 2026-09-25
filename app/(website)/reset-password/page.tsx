import { Suspense } from 'react';
import AuthShell from '@/components/website/AuthShell';
import ResetPasswordView from '@/components/auth/ResetPasswordView';

export default function ResetPasswordPage() {
  return (
    <AuthShell mode="login">
      <Suspense>
        <ResetPasswordView />
      </Suspense>
    </AuthShell>
  );
}
