import { Suspense } from 'react';
import AuthShell from '@/components/website/AuthShell';
import SignupForm from '@/components/auth/SignupForm';

export default function GetStartedPage() {
  return (
    <AuthShell mode="signup">
      <Suspense>
        <SignupForm />
      </Suspense>
    </AuthShell>
  );
}
