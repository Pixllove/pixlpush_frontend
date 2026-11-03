import { Suspense } from 'react';
import DashboardFrame from '@/components/dashboard/DashboardFrame';
import EnterpriseCheckout from '@/components/dashboard/EnterpriseCheckout';

export const metadata = {
  title: 'Enterprise checkout — PixlPush',
  robots: { index: false, follow: false },
  // The payment token is in the URL: never send it to another site.
  referrer: 'no-referrer',
};

/** Opened from the Enterprise offer email. Signing in is required (middleware sends visitors to /login and back). */
export default function EnterpriseCheckoutPage() {
  return (
    <DashboardFrame active="Billing & Usage" title="Enterprise checkout" description="Review your Enterprise package and pay securely.">
      <Suspense><EnterpriseCheckout /></Suspense>
    </DashboardFrame>
  );
}
