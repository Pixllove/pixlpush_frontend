import { redirect } from 'next/navigation';

type Props = { searchParams: Record<string, string | string[] | undefined> };

// HubSpot moved to Integrations. Kept because the HubSpot app's OAuth redirect URL
// points here: the ?code&state from HubSpot are passed on.
export default function HubspotSettingsRedirect({ searchParams }: Props) {
  const query = new URLSearchParams(Object.entries(searchParams).flatMap(([k, v]) => (Array.isArray(v) ? v : v ? [v] : []).map((x) => [k, x]))).toString();
  redirect(`/dashboard/integrations/hubspot${query ? `?${query}` : ''}`);
}
