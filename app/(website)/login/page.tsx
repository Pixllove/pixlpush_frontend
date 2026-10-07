import { Suspense } from 'react';
import AuthShell from '@/components/website/AuthShell';
import LoginForm from '@/components/auth/LoginForm';
import SignupForm from '@/components/auth/SignupForm';

export default function LoginPage() {
  return (
    <Suspense>
      <AuthShell mode="login">
        <LoginForm />
        <SignupForm />
      </AuthShell>
    </Suspense>
  );
}
