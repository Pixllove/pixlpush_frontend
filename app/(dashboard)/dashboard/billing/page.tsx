import DashboardFrame from '@/components/dashboard/DashboardFrame';
import { BillingSection } from '@/components/dashboard/BillingSection';
export default function BillingPage() { return <DashboardFrame active="Billing & Usage" title="Billing & Usage" description="Monitor plan limits, AI credits, sends and Project billing."><BillingSection /></DashboardFrame>; }
