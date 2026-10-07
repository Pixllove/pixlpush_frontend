import { Suspense } from 'react';
import AuthShell from '@/components/website/AuthShell';
import SignupForm from '@/components/auth/SignupForm';
import LoginForm from '@/components/auth/LoginForm';

export default function GetStartedPage() {
  return (
    <Suspense>
      <AuthShell mode="signup">
        <LoginForm />
        <SignupForm />
      </AuthShell>
    </Suspense>
  );
}
