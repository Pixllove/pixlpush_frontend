import { Suspense } from 'react';
import GoogleCallback from '@/components/auth/GoogleCallback';

export const metadata = { title: 'Signing in', robots: { index: false } };

export default function GoogleCallbackPage() {
  return (
    // GoogleCallback reads search params, which needs a Suspense boundary.
    <Suspense>
      <GoogleCallback />
    </Suspense>
  );
}
