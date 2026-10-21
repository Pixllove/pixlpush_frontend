import DashboardFrame from '@/components/dashboard/DashboardFrame';
import BillingCheckout from '@/components/dashboard/BillingCheckout';

export const metadata = { title: 'Billing Checkout — PixlPush' };

export default function BillingCheckoutPage() {
  return (
    <DashboardFrame requiresProject active="Billing & Usage" title="Checkout" description="Review your plan, add your billing details and pay securely.">
      <BillingCheckout />
    </DashboardFrame>
  );
}
