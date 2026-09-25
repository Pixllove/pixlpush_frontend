import { Suspense } from 'react';
import AuthShell from '@/components/website/AuthShell';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <AuthShell mode="login">
      {/* useSearchParams needs a Suspense boundary during static rendering. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
