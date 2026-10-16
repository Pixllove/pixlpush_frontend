import { Suspense } from 'react';
import AuthShell from '@/components/website/AuthShell';
import MfaLoginForm from '@/components/auth/MfaLoginForm';

export default function MfaLoginPage() {
  return (
    <Suspense>
      <AuthShell mode="security">
        <MfaLoginForm />
      </AuthShell>
    </Suspense>
  );
}
